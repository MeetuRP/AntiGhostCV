import MarketingLayout from '../../components/marketing/MarketingLayout';
import FeatureGrid from '../../components/marketing/FeatureGrid';

const Features = () => (
    <MarketingLayout>
        <div className="pt-40 pb-20">
            <FeatureGrid />
            <div className="max-w-7xl mx-auto px-6 py-20 border-t border-slate-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-20">
                    <div className="space-y-8">
                        <h3 className="text-4xl font-black tracking-tighter text-slate-900">Advanced Parser</h3>
                        <p className="text-lg text-slate-500 font-bold leading-relaxed italic">
                            Our proprietary engine doesn't just read text; it understands context. We identify the relationship between your skills and your impact.
                        </p>
                    </div>
                    <div className="space-y-8">
                        <h3 className="text-4xl font-black tracking-tighter text-slate-900">Real-time Feedback</h3>
                        <p className="text-lg text-slate-500 font-bold leading-relaxed italic">
                            Get instant suggestions as you type. Our AI acts as a 24/7 career coach sitting right beside you.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </MarketingLayout>
);

export default Features;
