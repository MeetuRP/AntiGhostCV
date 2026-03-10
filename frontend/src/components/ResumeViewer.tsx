import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
// Use local worker via Vite asset URL for better reliability
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface ResumeViewerProps {
    url: string;
    className?: string;
}



const ResumeViewer: React.FC<ResumeViewerProps> = ({ url, className = "" }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [pdf, setPdf] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [numPages, setNumPages] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [scale, setScale] = useState(1.5);



    useEffect(() => {
        const loadPdf = async () => {
            setLoading(true);
            setError(null);
            try {
                const loadingTask = pdfjsLib.getDocument(url);
                const pdfInstance = await loadingTask.promise;
                setPdf(pdfInstance);
                setNumPages(pdfInstance.numPages);
                setPageNumber(1);
            } catch (err: any) {
                console.error('Error loading PDF:', err);
                setError(err.message || 'Failed to load PDF document.');
            } finally {
                setLoading(false);
            }
        };

        if (url) loadPdf();
    }, [url]);

    useEffect(() => {
        const renderPage = async () => {
            if (!pdf || !canvasRef.current) return;

            try {
                const page = await pdf.getPage(pageNumber);
                // Respect PDF's internal rotation by default
                const viewport = page.getViewport({ scale });
                const canvas = canvasRef.current;
                const context = canvas.getContext('2d');

                if (context) {
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;

                    const renderContext = {
                        canvasContext: context,
                        viewport: viewport,
                        canvas: canvas
                    };
                    await page.render(renderContext).promise;


                }
            } catch (error) {
                console.error('Error rendering page:', error);
            }
        };

        renderPage();
    }, [pdf, pageNumber, scale]);

    const changePage = (offset: number) => {
        setPageNumber(prev => Math.min(Math.max(1, prev + offset), numPages));
    };

    return (
        <div className={`absolute inset-0 flex flex-col bg-slate-50/50 overflow-hidden ${className}`}>
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-[40] backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-sm font-medium text-slate-500">Preparing Resume View...</p>
                    </div>
                </div>
            )}

            {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-white z-[40] p-6 text-center">
                    <div className="max-w-xs">
                        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.876c1.27 0 2.09-1.383 1.458-2.484L13.458 5.485c-.632-1.101-2.214-1.101-2.846 0L4.562 15.516C3.93 16.617 4.75 18 6.022 18z" /></svg>
                        </div>
                        <h4 className="text-lg font-bold text-gray-900 mb-1">Viewer Error</h4>
                        <p className="text-sm text-gray-500 mb-6">{error}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="bg-indigo-600 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all"
                        >
                            Retry Loading
                        </button>
                    </div>
                </div>
            )}

            {/* Document Container */}
            <div className="flex-1 overflow-auto no-scrollbar relative bg-slate-200/40 p-10 flex flex-col items-center overscroll-contain" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <style>{`
                    .no-scrollbar::-webkit-scrollbar {
                        display: none;
                    }
                `}</style>
                <div className="shadow-[0_25px_70px_rgba(0,0,0,0.15)] rounded-sm bg-white border border-slate-300 h-fit relative">
                    <canvas ref={canvasRef} className="max-w-full h-auto origin-top" />


                </div>
                {/* Spacer to ensure scrolling past the fixed/absolute bottom controls */}
                <div className="h-32 w-full flex-shrink-0" />
            </div>

            {/* Centered Pagination (Bottom) */}
            {numPages > 1 && (
                <div className="absolute bottom-10 left-0 right-0 z-[60] flex justify-center pointer-events-none">
                    <div className="flex items-center gap-4 bg-gray-900/95 backdrop-blur-md px-6 py-2.5 rounded-2xl shadow-2xl border border-white/10 pointer-events-auto transition-all hover:scale-105">
                        <button
                            onClick={() => changePage(-1)}
                            disabled={pageNumber === 1}
                            className="text-white disabled:opacity-30 hover:text-indigo-400 transition-colors p-1"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>

                        <span className="text-white text-[11px] font-black tracking-[0.2em] uppercase min-w-[70px] text-center">
                            {pageNumber} <span className="text-gray-500 mx-1">/</span> {numPages}
                        </span>

                        <button
                            onClick={() => changePage(1)}
                            disabled={pageNumber === numPages}
                            className="text-white disabled:opacity-30 hover:text-indigo-400 transition-colors p-1"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
            {/* Zoom Controls (Top Right) */}
            <div className="absolute top-6 right-6 flex items-center gap-3 bg-white/90 backdrop-blur shadow-xl border border-slate-200 p-2 rounded-2xl z-30 font-sans">

                <button
                    onClick={() => setScale(prev => Math.max(prev - 0.2, 0.5))}
                    className="w-9 h-9 flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                    title="Zoom Out"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" /></svg>
                </button>

                <button
                    onClick={() => setScale(1.5)}
                    className="px-3 py-1 text-[10px] font-bold text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-all border border-transparent hover:border-slate-100"
                    title="Reset Zoom"
                >
                    {Math.round(scale * 100)}%
                </button>

                <button
                    onClick={() => setScale(prev => Math.min(prev + 0.2, 3))}
                    className="w-9 h-9 flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                    title="Zoom In"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                </button>
            </div>
        </div>
    );
};

export default ResumeViewer;
