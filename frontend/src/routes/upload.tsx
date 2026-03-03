import { useState } from 'react';
import Navbar from '../components/Navbar';
import FileUploader from '../components/FileUploader';
import api from '../lib/api';
import { useNavigate } from 'react-router';

const Upload = () => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [statusText, setStatusText] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const navigate = useNavigate();

    const handleAnalyze = async () => {
        if (!file) return;
        setIsProcessing(true);
        setStatusText('Uploading and parsing your resume...');

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await api.post('/resume/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setStatusText('Complete! Redirecting...');
            navigate(`/evaluate?resumeId=${response.data.id}`);
        } catch (err) {
            setStatusText('Error: Failed to process resume.');
            setIsProcessing(false);
        }
    };

    return (
        <main className="bg-[url('/images/bg-main.svg')] bg-cover">
            <Navbar />
            <section className="main-section">
                <div className="page-heading py-16">
                    <h1>Scan your resume</h1>
                    {isProcessing ? (
                        <>
                            <h2>{statusText}</h2>
                            <img src="/images/resume-scan.gif" className="w-full" alt="scanning" />
                        </>
                    ) : (
                        <>
                            <h2>Upload your PDF resume to extract skills and details</h2>
                            <div className="w-full max-w-xl mt-8 flex flex-col gap-4">
                                <FileUploader onFileSelect={setFile} />
                                <button
                                    className="primary-button disabled:opacity-50"
                                    onClick={handleAnalyze}
                                    disabled={!file}
                                >
                                    Proceed to Evaluation
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </section>
        </main>
    );
};

export default Upload;
