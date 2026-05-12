import { getMetrics } from '@/lib/data';
import { StatCard } from '@/components/StatCard';
import { RankingsChart } from '@/components/RankingsChart';
import { SegmentChart } from '@/components/SegmentChart';
import { DistributionPie } from '@/components/DistributionPie';
import { SentimentBar } from '@/components/SentimentBar';
import NavHeader from '@/components/NavHeader';

const ARRIVAL_ORDER = ['Before 8 AM', '8-10 AM', '10 AM-12 PM', '12-2 PM', 'After 2 PM'];

export default async function Dashboard() {
  const data = await getMetrics();
  const { metrics, rankings, segments } = data;

  return (
    <main className="min-h-screen text-white relative">
      <NavHeader subtitle={`Synthetic Demo Dashboard • ${metrics.total_responses.n} example records`} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Hero Stats */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold text-gray-300 mb-6 uppercase tracking-wider">
            Key Metrics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Skip Rate"
              value={`${metrics.skip_rate.pct}%`}
              subtitle={`${metrics.skip_rate.n}/${metrics.skip_rate.N} delayed or skipped class`}
              color="red"
            />
            <StatCard
              title="Difficulty Rate"
              value={`${metrics.ease_distribution.difficult_rate.pct}%`}
              subtitle={`${metrics.ease_distribution.difficult_rate.n}/${metrics.ease_distribution.difficult_rate.N} find parking difficult`}
              color="amber"
            />
            <StatCard
              title="Avg Search Time"
              value={`${metrics.minutes_searching.mean} min`}
              subtitle={`Median: ${metrics.minutes_searching.median} min (n=${metrics.minutes_searching.n})`}
              color="blue"
            />
            <StatCard
              title="Transit Potential"
              value={`${metrics.crimson_ride_willingness.pct}%`}
              subtitle={`${metrics.crimson_ride_willingness.n}/${metrics.crimson_ride_willingness.N} would switch if easier`}
              color="green"
            />
          </div>
        </section>

        {/* Rankings */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold text-gray-300 mb-6 uppercase tracking-wider">
            Challenge Priorities
          </h2>
          <RankingsChart rankings={rankings} />
        </section>

        {/* Segments */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold text-gray-300 mb-6 uppercase tracking-wider">
            Segment Analysis
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SegmentChart
              title="Skip Rate by Arrival Time"
              segments={segments.by_arrival_time}
              metric="skip_rate"
              metricLabel="Skip Rate"
              order={ARRIVAL_ORDER}
            />
            <SegmentChart
              title="Avg Search Time by Arrival"
              segments={segments.by_arrival_time}
              metric="avg_minutes"
              metricLabel="Minutes"
              order={ARRIVAL_ORDER}
            />
          </div>
        </section>

        {/* Distributions */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold text-gray-300 mb-6 uppercase tracking-wider">
            Response Distributions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <DistributionPie
              title="Ease of Finding Parking"
              data={metrics.ease_distribution.counts}
              colorScheme="difficulty"
            />
            <DistributionPie
              title="Parking Frequency"
              data={metrics.frequency_distribution.counts}
            />
            <SentimentBar
              title="Pay-to-Park Sentiment"
              data={metrics.pay_to_park_sentiment.counts}
            />
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-gray-800 pt-8 mt-12">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-sm text-gray-500">
            <p>
              Data source: Synthetic demo fixture • No real student data
            </p>
            <p>
              {data.metadata.total_rows} example records • Built with Next.js + Recharts
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
}
