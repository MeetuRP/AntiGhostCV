import { motion } from 'framer-motion';
import MarketingLayout from '../../components/marketing/MarketingLayout';
import { FiArrowRight, FiClock, FiUser } from 'react-icons/fi';


const blogPosts = [
    {
        title: "How Workday's AI Filters are Secretly Ghosting You",
        excerpt: "The truth behind modern Applicant Tracking Systems and why your qualified resume never reaches a human recruiter.",
        author: "Alex Rivers",
        date: "March 12, 2026",
        category: "ATS Deep Dive",
        readTime: "8 min read",
        image: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&q=80&w=800"
    },
    {
        title: "5 Measurable Achievements That Double Interview Callbacks",
        excerpt: "Stop using passive language. Learn how to quantify your impact using our AI-driven 'Fix-It' framework.",
        author: "Sarah Chen",
        date: "March 10, 2026",
        category: "Career Growth",
        readTime: "6 min read",
        image: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&q=80&w=800"
    },
    {
        title: "The Rise of RAG: How AI is Redefining Job Matching",
        excerpt: "Exploring the technical infrastructure behind AntiGhost CV and how semantic search beats keyword stuffing every time.",
        author: "AntiGhost Engineering",
        date: "March 05, 2026",
        category: "AI & Tech",
        readTime: "12 min read",
        image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=800"
    }
];

const Blog = () => {
    return (
        <MarketingLayout>
            <div className="pt-40 pb-40">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="mb-24">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600 mb-4 block">Our Journal</span>
                        <h1 className="text-7xl font-black tracking-tighter text-slate-900 leading-none mb-8">
                            Insights for the <br />
                            <span className="text-indigo-600 italic">Modern Seeker.</span>
                        </h1>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                        {blogPosts.map((post, idx) => (
                            <motion.article
                                key={idx}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="group cursor-pointer"
                            >
                                <div className="aspect-[16/10] bg-slate-100 rounded-[2.5rem] mb-8 overflow-hidden relative border border-slate-100 shadow-sm group-hover:shadow-2xl transition-all duration-700 group-hover:-translate-y-2">
                                    <img 
                                        src={post.image} 
                                        alt={post.title} 
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                    />
                                    <div className="absolute top-6 left-6 px-4 py-1.5 bg-white/90 backdrop-blur-md rounded-full text-[8px] font-black uppercase tracking-widest text-slate-900 shadow-sm">
                                        {post.category}
                                    </div>
                                </div>
                                
                                <div className="space-y-4 px-2">
                                    <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-widest text-slate-400">
                                        <div className="flex items-center gap-1.5"><FiUser /> {post.author}</div>
                                        <div className="flex items-center gap-1.5"><FiClock /> {post.readTime}</div>
                                    </div>
                                    <h2 className="text-2xl font-black tracking-tighter text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors">
                                        {post.title}
                                    </h2>
                                    <p className="text-sm text-slate-500 font-bold italic leading-relaxed line-clamp-2">
                                        {post.excerpt}
                                    </p>
                                    <button 
                                        onClick={() => alert("Full article coming soon! We're finishing up our editorial review.")}
                                        className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 hover:gap-4 transition-all pt-4"
                                    >
                                        Read Article <FiArrowRight />
                                    </button>
                                </div>
                            </motion.article>
                        ))}
                    </div>

                    <div className="mt-40 p-20 bg-slate-950 rounded-[4rem] text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
                        <div className="relative z-10 space-y-8">
                            <h2 className="text-4xl font-black text-white tracking-tighter">Stay ahead of the algorithm.</h2>
                            <p className="text-slate-400 font-bold italic max-w-xl mx-auto">Join our private newsletter for weekly ATS benchmarks and resume optimization tips from ex-Google recruiters.</p>
                            <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                                <input 
                                    type="email" 
                                    placeholder="Enter your email"
                                    className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-slate-600 font-bold italic focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                />
                                <button className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all">Subscribe</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </MarketingLayout>
    );
};

export default Blog;
