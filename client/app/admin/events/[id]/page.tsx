'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { CalendarDays, Building2, User, Users, FileText, Pencil, Mail, Phone, ChevronLeft, Bot } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export default function AdminEventDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [event, setEvent] = useState<any>(null);
    const [report, setReport] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    
    // Report Modal State
    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [responses, setResponses] = useState({
        actualAttendance: '',
        highlights: '',
        challenges: '',
        budget: '',
        takeaways: '',
        feedbackSummary: '',
        suggestions: '',
        additionalNotes: ''
    });

    useEffect(() => {
        const fetchUser = () => {
            const stored = localStorage.getItem('cf_user');
            if (stored) setUser(JSON.parse(stored));
        };
        fetchUser();

        if (!id) return;
        
        Promise.all([
            api.get('/events/' + id),
            api.get('/reports/' + id).catch(() => ({ data: null }))
        ]).then(([eventRes, reportRes]) => {
            setEvent(eventRes.data);
            setReport(reportRes.data);
        }).catch(err => {
            console.error(err);
        }).finally(() => setLoading(false));
    }, [id]);

    const handleGenerateReport = async () => {
        setGenerating(true);
        try {
            const res = await api.post('/reports/' + id, { responses });
            setReport(res.data);
            setReportModalOpen(false);
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to generate report.');
        } finally {
            setGenerating(false);
        }
    };

    if (loading) return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
    if (!event) return <div className="p-12 text-center text-muted-foreground">Event not found.</div>;

    const isCreator = user?.id === event.createdBy;
    const isPast = new Date() > new Date(event.endTime);

    return (
        <div className="flex flex-col gap-6" style={{ paddingBottom: '4rem' }}>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <button onClick={() => router.back()} className="flex items-center hover:text-foreground transition-colors"><ChevronLeft size={16} /> Back</button>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className={`text-[0.65rem] px-2.5 py-1 rounded-full font-bold ${event.status === 'APPROVED' ? 'bg-lime-500/10 text-lime-600' : event.status === 'PENDING' ? 'bg-amber-500/10 text-amber-600' : 'bg-red-500/10 text-red-600'}`}>
                            {event.status}
                        </span>
                        <span className="text-[0.65rem] px-2.5 py-1 rounded-full font-bold bg-secondary text-secondary-foreground">{event.category}</span>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight mb-1">{event.title}</h1>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => router.push(\`/admin/events/\${id}/edit\`)} className="gap-2">
                        <Pencil size={16} /> Edit Event
                    </Button>
                    
                    {report ? (
                        report.reportFileUrl ? (
                            <Button onClick={() => window.open(report.reportFileUrl, '_blank')} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
                                <FileText size={16} /> Download Report
                            </Button>
                        ) : (
                            <Button disabled variant="outline" className="gap-2">Processing Report...</Button>
                        )
                    ) : isPast && isCreator ? (
                        <Button onClick={() => setReportModalOpen(true)} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
                            <Bot size={16} /> Generate AI Report
                        </Button>
                    ) : null}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                <div className="md:col-span-2 space-y-6">
                    {event.posterUrl && (
                        <div className="rounded-xl overflow-hidden border bg-secondary/20 aspect-video md:aspect-[21/9] relative">
                            <img src={event.posterUrl} alt={event.title} className="w-full h-full object-cover" />
                        </div>
                    )}
                    
                    <div className="card space-y-4 shadow-sm border p-6 rounded-xl bg-card">
                        <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-2"><FileText size={18} /> Description</h3>
                        <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{event.description || 'No description provided.'}</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="card space-y-4 shadow-sm border p-6 rounded-xl bg-card">
                        <h3 className="text-lg font-semibold border-b pb-2">Event Details</h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex items-start gap-3">
                                <CalendarDays size={16} className="text-primary mt-0.5" />
                                <div>
                                    <div className="font-medium text-foreground">{format(parseISO(event.startTime), 'EEEE, MMMM do, yyyy')}</div>
                                    <div className="text-muted-foreground">{format(parseISO(event.startTime), 'h:mm a')} — {format(parseISO(event.endTime), 'h:mm a')}</div>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Building2 size={16} className="text-primary mt-0.5" />
                                <div>
                                    <div className="font-medium text-foreground">{event.hall?.name || 'No Venue'}</div>
                                    <div className="text-muted-foreground">{event.hall?.location || ''}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Users size={16} className="text-primary" />
                                <div><span className="font-medium text-foreground">{event._count?.rsvps || 0}</span> <span className="text-muted-foreground">RSVPs</span></div>
                            </div>
                        </div>
                    </div>

                    <div className="card space-y-4 shadow-sm border p-6 rounded-xl bg-card">
                        <h3 className="text-lg font-semibold border-b pb-2">Contact Info</h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex items-center gap-3">
                                <User size={16} className="text-primary" />
                                <div><span className="font-medium">{event.creator?.name || 'N/A'}</span> <span className="text-muted-foreground">(Organizer)</span></div>
                            </div>
                            {event.hostEmail && (
                                <div className="flex items-center gap-3">
                                    <Mail size={16} className="text-primary" />
                                    <div className="text-foreground">{event.hostEmail}</div>
                                </div>
                            )}
                            {event.hostPhone && (
                                <div className="flex items-center gap-3">
                                    <Phone size={16} className="text-primary" />
                                    <div className="text-foreground">+91 {event.hostPhone}</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* AI Report Questionnaire Modal */}
            <Dialog open={reportModalOpen} onOpenChange={setReportModalOpen}>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><Bot className="text-indigo-500" /> Generate Post-Event Report</DialogTitle>
                        <DialogDescription>
                            Provide a quick summary of how the event went. Our AI will automatically write a professional, formatted Word document report for management review.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="actualAttendance">Actual Attendance</Label>
                            <Textarea id="actualAttendance" placeholder="E.g., About 120 people attended, mostly second-year students." 
                                value={responses.actualAttendance} onChange={e => setResponses({...responses, actualAttendance: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="highlights">Highlights & Achievements</Label>
                            <Textarea id="highlights" placeholder="E.g., The guest speaker session was highly interactive." 
                                value={responses.highlights} onChange={e => setResponses({...responses, highlights: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="challenges">Challenges Faced & Solutions</Label>
                            <Textarea id="challenges" placeholder="E.g., Audio issues delayed the start by 10 mins, but IT fixed it quickly." 
                                value={responses.challenges} onChange={e => setResponses({...responses, challenges: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="takeaways">Key Takeaways</Label>
                            <Textarea id="takeaways" placeholder="E.g., Students are very interested in AI workshops; we need a larger venue next time." 
                                value={responses.takeaways} onChange={e => setResponses({...responses, takeaways: e.target.value})} />
                        </div>
                    </div>
                    
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setReportModalOpen(false)} disabled={generating}>Cancel</Button>
                        <Button onClick={handleGenerateReport} disabled={generating} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                            {generating ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <Bot size={16} />}
                            {generating ? 'Generating Report...' : 'Generate AI Report'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}
