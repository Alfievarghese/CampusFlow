const prisma = require('../lib/prisma');

/**
 * Core Conflict Detection Engine
 * Checks if a proposed time slot for a hall conflicts with existing events.
 */

/**
 * Check if two time ranges overlap
 * @param {Date} startA 
 * @param {Date} endA 
 * @param {Date} startB 
 * @param {Date} endB 
 * @returns {boolean}
 */
function timesOverlap(startA, endA, startB, endB) {
    return startA < endB && endA > startB;
}

/**
 * Expand recurring events into concrete instances within a date window
 * @param {Object} event - Prisma Event object with recurrenceRule
 * @param {Date} windowStart 
 * @param {Date} windowEnd 
 * @returns {Array<{start: Date, end: Date}>}
 */
function expandRecurringEvent(event, windowStart, windowEnd) {
    if (!event.recurrenceRule) {
        return [{ start: new Date(event.startTime), end: new Date(event.endTime) }];
    }

    let rule;
    try {
        rule = JSON.parse(event.recurrenceRule);
    } catch {
        return [{ start: new Date(event.startTime), end: new Date(event.endTime) }];
    }

    const instances = [];
    const durationMs = new Date(event.endTime) - new Date(event.startTime);
    const until = rule.until ? new Date(rule.until) : new Date(windowEnd);
    const interval = rule.interval || 1;

    let currentStart = new Date(event.startTime);

    // Advance to window start if base date is before window
    while (currentStart < windowStart) {
        if (rule.type === 'WEEKLY') {
            currentStart = new Date(currentStart.getTime() + interval * 7 * 24 * 60 * 60 * 1000);
        } else if (rule.type === 'MONTHLY') {
            currentStart = new Date(currentStart);
            currentStart.setMonth(currentStart.getMonth() + interval);
        } else {
            // CUSTOM - treat as daily with given interval in days
            currentStart = new Date(currentStart.getTime() + interval * 24 * 60 * 60 * 1000);
        }
    }

    // Generate instances within window
    while (currentStart <= until && currentStart <= windowEnd) {
        const currentEnd = new Date(currentStart.getTime() + durationMs);
        if (currentStart >= windowStart) {
            instances.push({ start: new Date(currentStart), end: currentEnd });
        }

        if (rule.type === 'WEEKLY') {
            currentStart = new Date(currentStart.getTime() + interval * 7 * 24 * 60 * 60 * 1000);
        } else if (rule.type === 'MONTHLY') {
            currentStart = new Date(currentStart);
            currentStart.setMonth(currentStart.getMonth() + interval);
        } else {
            currentStart = new Date(currentStart.getTime() + interval * 24 * 60 * 60 * 1000);
        }
    }

    return instances;
}

/**
 * Main conflict check function
 * @param {string} hallId 
 * @param {Date} newStart 
 * @param {Date} newEnd 
 * @param {string|null} excludeEventId - Exclude this event (for updates)
 * @returns {Promise<{hasConflict: boolean, conflictingEvents: Array}>}
 */
async function checkConflicts(hallId, newStart, newEnd, excludeEventId = null) {
    // Fetch all non-cancelled events for the same hall within a broad window
    const windowStart = new Date(newStart);
    windowStart.setHours(0, 0, 0, 0);
    const windowEnd = new Date(newEnd);
    windowEnd.setHours(23, 59, 59, 999);

    const existingEvents = await prisma.event.findMany({
        where: {
            hallId,
            status: { not: 'CANCELLED' },
            id: excludeEventId ? { not: excludeEventId } : undefined,
            // Fetch events that could possibly overlap with our day window
            startTime: { lte: windowEnd },
            endTime: { gte: windowStart },
        },
        include: {
            creator: { select: { name: true, email: true } },
            hall: { select: { name: true } },
        },
    });

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
                    hall: event.hall.name,
                    host: event.creator.name,
                    status: event.status,
                    isRecurring: !!event.recurrenceRule,
                });
                break; // Only report each event once even if multiple instances
            }
        }
    }

    return {
        hasConflict: conflictingEvents.length > 0,
        conflictingEvents,
    };
}

/**
 * Check conflicts for all instances of a recurring event being created
 * @param {string} hallId
 * @param {Date} firstStart
 * @param {Date} firstEnd
 * @param {Object} recurrenceRule
 * @param {string|null} excludeEventId
 * @returns {Promise<{hasConflict: boolean, conflictsByDate: Array}>}
 */
async function checkRecurringConflicts(hallId, firstStart, firstEnd, recurrenceRule, excludeEventId = null) {
    const instances = [];
    const durationMs = new Date(firstEnd) - new Date(firstStart);
    const until = recurrenceRule.until ? new Date(recurrenceRule.until) : (() => {
        const d = new Date(firstStart);
        d.setFullYear(d.getFullYear() + 1); // default 1 year
        return d;
    })();
    const interval = recurrenceRule.interval || 1;

    let currentStart = new Date(firstStart);
    while (currentStart <= until) {
        instances.push({
            start: new Date(currentStart),
            end: new Date(currentStart.getTime() + durationMs),
        });
        if (recurrenceRule.type === 'WEEKLY') {
            currentStart = new Date(currentStart.getTime() + interval * 7 * 24 * 60 * 60 * 1000);
        } else if (recurrenceRule.type === 'MONTHLY') {
            currentStart = new Date(currentStart);
            currentStart.setMonth(currentStart.getMonth() + interval);
        } else {
            currentStart = new Date(currentStart.getTime() + interval * 24 * 60 * 60 * 1000);
        }
    }

    const conflictsByDate = [];
    for (const instance of instances) {
        const result = await checkConflicts(hallId, instance.start, instance.end, excludeEventId);
        if (result.hasConflict) {
            conflictsByDate.push({ date: instance.start, conflicts: result.conflictingEvents });
        }
    }

    return {
        hasConflict: conflictsByDate.length > 0,
        conflictsByDate,
    };
}

module.exports = { checkConflicts, checkRecurringConflicts, timesOverlap, expandRecurringEvent };
