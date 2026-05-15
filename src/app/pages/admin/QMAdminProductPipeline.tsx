export function QMAdminProductPipeline() {
  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 56px)' }}>
      <iframe
        src="/product-pipeline-artifact.html"
        style={{ width: '100%', flex: 1, border: 0 }}
        title="Product Pipeline"
      />
    </div>
  );
}
