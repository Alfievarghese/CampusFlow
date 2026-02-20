const supabase = require('../lib/supabase');

/**
 * Core Conflict Detection Engine
 * Checks if a proposed time slot for a hall conflicts with existing events.
 */

function timesOverlap(startA, endA, startB, endB) {
    return startA < endB && endA > startB;
}

function expandRecurringEvent(event, windowStart, windowEnd) {
    if (!event.recurrenceRule) {
        return [{ start: new Date(event.startTime), end: new Date(event.endTime) }];
    }
    let rule;
    try { rule = JSON.parse(event.recurrenceRule); } catch { return [{ start: new Date(event.startTime), end: new Date(event.endTime) }]; }

    const instances = [];
    const durationMs = new Date(event.endTime) - new Date(event.startTime);
    const until = rule.until ? new Date(rule.until) : new Date(windowEnd);
    const interval = rule.interval || 1;
    let currentStart = new Date(event.startTime);

    while (currentStart < windowStart) {
        if (rule.type === 'WEEKLY') currentStart = new Date(currentStart.getTime() + interval * 7 * 24 * 60 * 60 * 1000);
        else if (rule.type === 'MONTHLY') { currentStart = new Date(currentStart); currentStart.setMonth(currentStart.getMonth() + interval); }
        else currentStart = new Date(currentStart.getTime() + interval * 24 * 60 * 60 * 1000);
    }

    while (currentStart <= until && currentStart <= windowEnd) {
        const currentEnd = new Date(currentStart.getTime() + durationMs);
        if (currentStart >= windowStart) instances.push({ start: new Date(currentStart), end: currentEnd });
        if (rule.type === 'WEEKLY') currentStart = new Date(currentStart.getTime() + interval * 7 * 24 * 60 * 60 * 1000);
        else if (rule.type === 'MONTHLY') { currentStart = new Date(currentStart); currentStart.setMonth(currentStart.getMonth() + interval); }
        else currentStart = new Date(currentStart.getTime() + interval * 24 * 60 * 60 * 1000);
    }
    return instances;
}

async function checkConflicts(hallId, newStart, newEnd, excludeEventId = null) {
    const windowStart = new Date(newStart); windowStart.setHours(0, 0, 0, 0);
    const windowEnd = new Date(newEnd); windowEnd.setHours(23, 59, 59, 999);

    let query = supabase.from('Event')
        .select('id, title, startTime, endTime, recurrenceRule, status, hall:Hall(name), creator:User(name, email)')
        .eq('hallId', hallId)
        .neq('status', 'CANCELLED')
        .lte('startTime', windowEnd.toISOString())
        .gte('endTime', windowStart.toISOString());

    if (excludeEventId) query = query.neq('id', excludeEventId);

    const { data: existingEvents = [] } = await query;

    const conflictingEvents = [];
    for (const event of existingEvents) {
        const instances = expandRecurringEvent(event, windowStart, windowEnd);
        for (const instance of instances) {
            if (timesOverlap(newStart, newEnd, instance.start, instance.end)) {
                conflictingEvents.push({
                    id: event.id,
                    title: event.title,
                    startTime: instance.start,
                    endTime: instance.end,
                    hall: event.hall?.name,
                    host: event.creator?.name,
                    status: event.status,
                    isRecurring: !!event.recurrenceRule,
                });
                break;
            }
        }
    }

    return { hasConflict: conflictingEvents.length > 0, conflictingEvents };
}

async function checkRecurringConflicts(hallId, firstStart, firstEnd, recurrenceRule, excludeEventId = null) {
    const instances = [];
    const durationMs = new Date(firstEnd) - new Date(firstStart);
    const until = recurrenceRule.until ? new Date(recurrenceRule.until) : (() => { const d = new Date(firstStart); d.setFullYear(d.getFullYear() + 1); return d; })();
    const interval = recurrenceRule.interval || 1;

    let currentStart = new Date(firstStart);
    while (currentStart <= until) {
        instances.push({ start: new Date(currentStart), end: new Date(currentStart.getTime() + durationMs) });
        if (recurrenceRule.type === 'WEEKLY') currentStart = new Date(currentStart.getTime() + interval * 7 * 24 * 60 * 60 * 1000);
        else if (recurrenceRule.type === 'MONTHLY') { currentStart = new Date(currentStart); currentStart.setMonth(currentStart.getMonth() + interval); }
        else currentStart = new Date(currentStart.getTime() + interval * 24 * 60 * 60 * 1000);
    }

    const conflictsByDate = [];
    for (const instance of instances) {
        const result = await checkConflicts(hallId, instance.start, instance.end, excludeEventId);
        if (result.hasConflict) conflictsByDate.push({ date: instance.start, conflicts: result.conflictingEvents });
    }

    return { hasConflict: conflictsByDate.length > 0, conflictsByDate };
}

module.exports = { checkConflicts, checkRecurringConflicts, timesOverlap, expandRecurringEvent };
