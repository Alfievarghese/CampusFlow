'use client';
import { useEffect, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { Search } from 'lucide-react';

interface GridConfig {
    numCards: number;
    cols: number;
    xBase: number;
    yBase: number;
    xStep: number;
    yStep: number;
}

export default function AnimatedLoadingSkeleton() {
    const [windowWidth, setWindowWidth] = useState(0);
    const controls = useAnimation();

    const getGridConfig = (width: number): GridConfig => {
        const numCards = 6;
        const cols = width >= 1024 ? 3 : width >= 640 ? 2 : 1;
        
        // Adjust spacing for responsiveness
        const xStep = width >= 1024 ? 220 : width >= 640 ? 200 : 180;
        const yStep = 240; 
        
        return {
            numCards,
            cols,
            xBase: 40,
            yBase: 60,
            xStep,
            yStep
        };
    };

    const generateSearchPath = (config: GridConfig) => {
        const { numCards, cols, xBase, yBase, xStep, yStep } = config;
        const rows = Math.ceil(numCards / cols);
        const allPositions = [];

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                if ((row * cols + col) < numCards) {
                    allPositions.push({
                        x: xBase + (col * xStep),
                        y: yBase + (row * yStep)
                    });
                }
            }
        }

        const numRandomCards = Math.min(4, allPositions.length);
        const shuffledPositions = [...allPositions]
            .sort(() => Math.random() - 0.5)
            .slice(0, numRandomCards);

        if (shuffledPositions.length > 0) {
            shuffledPositions.push(shuffledPositions[0]);
        } else {
            return { x: [0], y: [0] }; // Fallback
        }

        return {
            x: shuffledPositions.map(pos => pos.x),
            y: shuffledPositions.map(pos => pos.y),
            scale: Array(shuffledPositions.length).fill(1.2),
            transition: {
                duration: shuffledPositions.length * 1.5,
                repeat: Infinity,
                ease: "easeInOut",
                times: shuffledPositions.map((_, i) => i / (shuffledPositions.length - 1))
            } as any
        };
    };

    useEffect(() => {
        setWindowWidth(window.innerWidth);
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (windowWidth > 0) {
            const config = getGridConfig(windowWidth);
            controls.start(generateSearchPath(config) as any);
        }
    }, [windowWidth, controls]);

    const frameVariants = {
        hidden: { opacity: 0, scale: 0.98 },
        visible: { opacity: 1, scale: 1, transition: { duration: 0.4 } }
    };

    const cardVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: (i: number) => ({
            y: 0,
            opacity: 1,
            transition: { delay: i * 0.1, duration: 0.4 }
        })
    };

    const glowVariants: any = {
        animate: {
            boxShadow: [
                "0 0 20px var(--lime-glow)",
                "0 0 35px var(--lime-glow)",
                "0 0 20px var(--lime-glow)"
            ],
            scale: [1, 1.1, 1],
            transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
        }
    };

    const config = windowWidth > 0 ? getGridConfig(windowWidth) : getGridConfig(1024);

    return (
        <motion.div
            style={{ width: '100%', maxWidth: '1000px', margin: '0 auto', padding: '1.5rem' }}
            variants={frameVariants}
            initial="hidden"
            animate="visible"
        >
            <div style={{
                position: 'relative', overflow: 'hidden', borderRadius: 'var(--radius-lg)',
                background: 'var(--surface-2)', padding: '2rem', border: '1px solid var(--border)'
            }}>
                {/* Search icon with animation */}
                <motion.div
                    style={{ position: 'absolute', zIndex: 10, pointerEvents: 'none', left: 24, top: 24 }}
                    animate={controls}
                >
                    <motion.div
                        style={{
                            background: 'var(--ink)',
                            padding: '0.75rem',
                            borderRadius: '50%',
                            backdropFilter: 'blur(4px)',
                            border: '1px solid var(--border-bright)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                        variants={glowVariants}
                        animate="animate"
                    >
                        <Search size={24} style={{ color: 'var(--lime)' }} strokeWidth={2.5} />
                    </motion.div>
                </motion.div>

                {/* Grid of animated cards */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${config.cols}, 1fr)`,
                    gap: '1.5rem'
                }}>
                    {[...Array(config.numCards)].map((_, i) => (
                        <motion.div
                            key={i}
                            variants={cardVariants}
                            initial="hidden"
                            animate="visible"
                            custom={i}
                            whileHover={{ scale: 1.02 }}
                            style={{
                                background: 'var(--surface)',
                                borderRadius: 'var(--radius)',
                                padding: '1.25rem',
                                border: '1px solid var(--border)',
                                boxShadow: 'var(--shadow-sm)'
                            }}
                        >
                            <motion.div
                                style={{
                                    height: '8rem', borderRadius: '0.4rem', marginBottom: '1rem',
                                    background: 'var(--ink-2)'
                                }}
                                animate={{ opacity: [0.4, 0.7, 0.4] }}
                                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                            />
                            <motion.div
                                style={{
                                    height: '0.8rem', width: '75%', borderRadius: '4px', marginBottom: '0.6rem',
                                    background: 'var(--ink-2)'
                                }}
                                animate={{ opacity: [0.4, 0.7, 0.4] }}
                                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                            />
                            <motion.div
                                style={{
                                    height: '0.8rem', width: '50%', borderRadius: '4px',
                                    background: 'var(--ink-2)'
                                }}
                                animate={{ opacity: [0.4, 0.7, 0.4] }}
                                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                            />
                        </motion.div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
}
