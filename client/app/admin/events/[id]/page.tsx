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

                <div className="flex flex-col items-center justify-center gap-6 mt-12 mb-12 relative text-center">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-primary/10 rounded-full blur-[100px] pointer-events-none"></div>
                <div className="flex flex-col items-center z-10 w-full">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <span className={`text-[0.65rem] px-3 py-1.5 rounded-full font-bold uppercase tracking-widest ${
                            isPast ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' :
                            event.status === 'CONFIRMED' ? 'bg-lime-500/10 text-lime-400 border border-lime-500/20' :
                            event.status === 'PENDING' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                            'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                            {isPast ? 'COMPLETED' : event.status}
                        </span>
                        <span className="text-[0.65rem] px-3 py-1.5 rounded-full font-bold tracking-widest bg-white/10 border border-white/20 text-white uppercase backdrop-blur-md shadow-sm">
                            {event.category?.name || event.category}
                        </span>
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black mb-6 bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent pb-1" style={{ fontFamily: 'var(--font-display)', filter: 'drop-shadow(0 0 30px rgba(255,255,255,0.15))', letterSpacing: '0.01em' }}>
                        {event.title}
                    </h1>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-5 z-10 w-full">
                    <Button variant="outline" onClick={() => router.push(`/admin/events/${id}/edit`)} style={{ padding: '0 1.5rem' }} className="gap-2.5 h-12 rounded-full border-white/20 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white shadow-lg shadow-black/30 hover:-translate-y-1 transition-all duration-300 flex items-center justify-center">
                        <Pencil size={18} /> <span>Edit Event</span>
                    </Button>
                    
                    {report ? (
                        report.reportFileUrl ? (
                            <Button onClick={() => window.open(report.reportFileUrl, '_blank')} style={{ padding: '0 1.5rem' }} className="gap-2.5 h-12 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)] border-0 hover:-translate-y-1 transition-all duration-300 flex items-center justify-center">
                                <FileText size={18} /> <span>Download Report</span>
                            </Button>
                        ) : report.status === 'FAILED' ? (
                            <Button onClick={() => setReportModalOpen(true)} style={{ padding: '0 1.5rem' }} className="gap-2.5 h-12 rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 shadow-none hover:-translate-y-1 transition-all duration-300 flex items-center justify-center">
                                <Bot size={18} /> <span>Retry AI Report</span>
                            </Button>
                        ) : (
                            <Button disabled style={{ padding: '0 1.5rem' }} className="gap-2.5 h-12 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 shadow-none opacity-80 cursor-not-allowed flex items-center justify-center">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-300"></div> <span>Processing Report...</span>
                            </Button>
                        )
                    ) : (isPast && isCreator) || (isPast && user?.role === 'SUPER_ADMIN') ? (
                        <Button onClick={() => setReportModalOpen(true)} style={{ padding: '0 1.5rem' }} className="gap-2.5 h-12 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)] border-0 hover:-translate-y-1 transition-all duration-300 flex items-center justify-center">
                            <Bot size={18} /> <span>Generate AI Report</span>
                        </Button>
                    ) : null}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
                <div className="md:col-span-2 flex flex-col gap-8">
                    {event.posterUrl && (
                        <div className="rounded-[2rem] overflow-hidden border border-white/5 bg-white/5 aspect-video md:aspect-[21/9] relative shadow-2xl">
                            <img src={event.posterUrl} alt={event.title} className="w-full h-full object-cover" />
                        </div>
                    )}
                    
                    <div className="bento-item flex flex-col gap-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2 border-b border-border/50 pb-3"><FileText size={18} className="text-primary" /> Description</h3>
                        <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap">{event.description || 'No description provided.'}</p>
                    </div>
                </div>

                <div className="flex flex-col gap-8">
                    <div className="bento-item flex flex-col gap-5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                        <h3 className="text-xl font-bold border-b border-white/10 pb-4 tracking-tight">Event Details</h3>
                        <div className="flex flex-col gap-5 text-sm relative z-10">
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

                    <div className="bento-item flex flex-col gap-5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                        <h3 className="text-xl font-bold border-b border-white/10 pb-4 tracking-tight">Contact Info</h3>
                        <div className="flex flex-col gap-5 text-sm relative z-10">
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
                    
                    <DialogFooter className="gap-3 sm:space-x-0 mt-2">
                        <Button variant="outline" onClick={() => setReportModalOpen(false)} disabled={generating} className="border-border-bright hover:bg-secondary/50">Cancel</Button>
                        <Button onClick={handleGenerateReport} disabled={generating} className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white gap-2 shadow-lg shadow-indigo-500/25 border-0 hover:scale-105 transition-all">
                            {generating ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <Bot size={16} />}
                            {generating ? 'Generating Report...' : 'Generate AI Report'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}
