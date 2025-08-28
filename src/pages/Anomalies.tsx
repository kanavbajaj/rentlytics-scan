import AnomaliesTable from '@/components/AnomaliesTable';

const Anomalies = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Anomaly Detection</h1>
          <p className="text-muted-foreground">
            Advanced anomaly detection and analysis for your vehicle fleet
          </p>
        </div>
      </div>

      <AnomaliesTable />
    </div>
  );
};

export default Anomalies;
