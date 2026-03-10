const express = require('express');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../lib/supabase');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');
const { auditLog } = require('../lib/audit');

const router = express.Router();

const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, BorderStyle, WidthType } = require('docx');

// ─── OpenRouter config ───
const OPENROUTER_API_KEY = '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';
const OPENROUTER_MODEL = 'anthropic/claude-3.7-sonnet';

// ─── POST /api/reports/:eventId — Submit questionnaire + generate report ───
router.post('/:eventId', authenticate, requireAdmin, async (req, res) => {
    const { responses } = req.body;
    if (!responses) return res.status(400).json({ error: 'Responses are required.' });

    // Verify event exists and user is the creator
    const { data: event } = await supabase.from('Event')
        .select('id, title, description, startTime, endTime, category, expectedAttendance, createdBy, hall:Hall(name, location), creator:User(name, email)')
        .eq('id', req.params.eventId).single();

    if (!event) return res.status(404).json({ error: 'Event not found.' });
    if (event.createdBy !== req.user.id && req.user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Only the event creator can create a report.' });
    }

    // Check if report already exists
    const { data: existingReport } = await supabase.from('EventReport').select('id, status').eq('eventId', req.params.eventId).single();
    if (existingReport) return res.status(409).json({ error: 'A report already exists for this event.', report: existingReport });

    // Save the report as DRAFT first
    const reportId = uuidv4();
    const { error: insertErr } = await supabase.from('EventReport').insert({
        id: reportId,
        eventId: req.params.eventId,
        createdById: req.user.id,
        responses: JSON.stringify(responses),
        status: 'DRAFT',
        createdAt: new Date().toISOString(),
    });
    if (insertErr) return res.status(500).json({ error: insertErr.message });

    // Generate AI report via OpenRouter
    try {
        const prompt = buildReportPrompt(event, responses);
        
        const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://campusflow.app',
                'X-Title': 'CampusFlow Event Reports',
            },
            body: JSON.stringify({
                model: OPENROUTER_MODEL,
                messages: [
                    { role: 'system', content: 'You are a professional event report writer for a college campus event management system. You MUST output ONLY valid JSON. Your JSON must have exactly these keys: executiveSummary, eventOverview, attendanceAnalysis, highlights, challenges, financialSummary, keyTakeaways, recommendations, conclusion. Each key should contain a detailed professional string summarizing that section. Do NOT use markdown. Just plain text strings for each section.' },
                    { role: 'user', content: prompt },
                ],
                max_tokens: 4000,
                temperature: 0.4,
                response_format: { type: "json_object" }
            }),
        });

        const aiData = await aiResponse.json();
        const aiText = aiData.choices?.[0]?.message?.content;
        let reportJson = {};
        try {
            reportJson = JSON.parse(aiText);
        } catch(e) {
            console.error("AI returned invalid JSON", aiText);
            throw new Error("Failed to parse AI JSON");
        }

        // Build the Word Document
        const children = [
            new Paragraph({ text: `Post-Event Report: ${event.title}`, heading: HeadingLevel.HEADING_1 }),
            new Paragraph({ text: `Date: ${new Date().toLocaleDateString()}`, spacing: { after: 200 } }),
            new Paragraph({ text: `Prepared by: CampusFlow AI`, spacing: { after: 400 } }),
        ];

        const sectionTitles = {
            executiveSummary: "Executive Summary",
            eventOverview: "Event Overview",
            attendanceAnalysis: "Attendance Analysis",
            highlights: "Highlights & Achievements",
            challenges: "Challenges & Solutions",
            financialSummary: "Financial Summary",
            keyTakeaways: "Key Takeaways",
            recommendations: "Recommendations for Future",
            conclusion: "Conclusion"
        };

        for (const [key, title] of Object.entries(sectionTitles)) {
            if (reportJson[key]) {
                children.push(new Paragraph({ text: title, heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 120 } }));
                children.push(new Paragraph({ text: reportJson[key], spacing: { after: 200 } }));
            }
        }

        const doc = new Document({
            sections: [{
                properties: {},
                children: children
            }]
        });

        const buffer = await Packer.toBuffer(doc);

        // Upload docx to Supabase Storage
        const fileName = `report_${reportId}.docx`;
        const { error: uploadErr } = await supabase.storage
            .from('event-images')
            .upload(fileName, buffer, { contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', upsert: false });

        let reportFileUrl = null;
        if (!uploadErr) {
            const { data: urlData } = supabase.storage.from('event-images').getPublicUrl(fileName);
            reportFileUrl = urlData.publicUrl;
        }

        // Update report status
        await supabase.from('EventReport').update({
            status: 'GENERATED',
            reportFileUrl,
        }).eq('id', reportId);

        await auditLog(req.user.id, 'REPORT_CREATED', reportId, { eventId: req.params.eventId });

        res.status(201).json({
            id: reportId,
            eventId: req.params.eventId,
            status: 'GENERATED',
            reportFileUrl,
            reportContent: JSON.stringify(reportJson),
        });
    } catch (aiError) {
        console.error('[AI Report Error]', aiError);
        await supabase.from('EventReport').update({ status: 'ERROR' }).eq('id', reportId);
        res.status(500).json({ error: 'AI report generation failed. The draft has been saved.' });
    }
});

// ─── GET /api/reports/:eventId — Get report for an event ───
router.get('/:eventId', authenticate, async (req, res) => {
    const { data: report } = await supabase.from('EventReport')
        .select('id, eventId, responses, reportFileUrl, status, createdAt, createdBy:User(id, name, email)')
        .eq('eventId', req.params.eventId).single();

    if (!report) return res.status(404).json({ error: 'No report found for this event.' });
    res.json(report);
});

// ─── GET /api/reports — List all reports (SUPER_ADMIN / ORG_HEAD) ───
router.get('/', authenticate, requireAdmin, async (req, res) => {
    const { category, search, from, to } = req.query;
    
    let query = supabase.from('EventReport')
        .select('id, eventId, status, reportFileUrl, createdAt, event:Event(id, title, category, startTime, endTime, organizationId, hall:Hall(name)), createdBy:User(id, name)')
        .order('createdAt', { ascending: false });

    const { data: reports, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    // Client-side filtering for search/category
    let filtered = reports || [];
    if (category) filtered = filtered.filter(r => r.event?.category === category);
    if (search) filtered = filtered.filter(r => r.event?.title?.toLowerCase().includes(search.toLowerCase()));
    if (from) filtered = filtered.filter(r => new Date(r.event?.startTime) >= new Date(from));
    if (to) filtered = filtered.filter(r => new Date(r.event?.startTime) <= new Date(to));

    res.json(filtered);
});

// ─── Helper: Build AI prompt ───
function buildReportPrompt(event, responses) {
    return `
Generate a comprehensive Post-Event Completion Report for the following campus event.

## Event Details
- **Event Title:** ${event.title}
- **Category:** ${event.category}
- **Description:** ${event.description}
- **Venue:** ${event.hall?.name || 'N/A'} (${event.hall?.location || 'N/A'})
- **Date & Time:** ${new Date(event.startTime).toLocaleString()} to ${new Date(event.endTime).toLocaleString()}
- **Expected Attendance:** ${event.expectedAttendance}
- **Organized by:** ${event.creator?.name || 'N/A'}

## Host Responses (Post-Event Questionnaire)
1. **Actual Attendance:** ${responses.actualAttendance || 'Not provided'}
2. **Event Highlights:** ${responses.highlights || 'Not provided'}
3. **Challenges Faced:** ${responses.challenges || 'Not provided'}
4. **Sponsor/Budget Details:** ${responses.budget || 'Not provided'}
5. **Key Takeaways:** ${responses.takeaways || 'Not provided'}
6. **Feedback Summary:** ${responses.feedbackSummary || 'Not provided'}
7. **Suggestions for Improvement:** ${responses.suggestions || 'Not provided'}
8. **Additional Notes:** ${responses.additionalNotes || 'Not provided'}

## Instructions
You MUST return ONLY a JSON object mapping to the sections outlined above. Do not wrap in markdown \`\`\`json. Just literal valid JSON.

module.exports = router;
