import { useState, useRef } from 'react';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from './ui/drawer';
import { Button } from './ui/button';
import { X, Loader2, Upload, FileUp, Check, AlertCircle } from 'lucide-react';
import { uploadCatalogFile } from '../services/api';

interface CatalogUploadDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete?: (catalogId: string) => void;
}

export function CatalogUploadDrawer({ open, onOpenChange, onUploadComplete }: CatalogUploadDrawerProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ message: string; isError: boolean; debug?: any } | null>(null);
  const [uploadedCatalog, setUploadedCatalog] = useState<{ id: string; item_count: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    const validTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    const validExtensions = ['.csv', '.xlsx', '.xls'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!validTypes.includes(file.type) && !validExtensions.includes(ext)) {
      setUploadResult({ message: 'Please upload a CSV or Excel file (.csv, .xlsx, .xls)', isError: true });
      return;
    }

    setSelectedFile(file);
    setUploadResult(null);
    setUploadedCatalog(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadResult(null);

    const res = await uploadCatalogFile(selectedFile);

    if (res.error) {
      setUploadResult({ message: res.error, isError: true, debug: (res as any).data?.debug });
    } else if (res.data) {
      const data = res.data as any;
      const isZero = data.item_count === 0;
      setUploadResult({
        message: data.message || `${data.item_count} products imported`,
        isError: isZero,
        debug: data.debug,
      });
      if (!isZero) {
        setUploadedCatalog({ id: data.id, item_count: data.item_count });
      }
    }

    setUploading(false);
  };

  const handleClose = () => {
    if (uploadedCatalog && onUploadComplete) {
      onUploadComplete(uploadedCatalog.id);
    }
    // Reset state
    setSelectedFile(null);
    setUploadResult(null);
    setUploadedCatalog(null);
    onOpenChange(false);
  };

  const estimatedRows = selectedFile
    ? `~${Math.round(selectedFile.size / 100)} rows (estimated)`
    : null;

  return (
    <Drawer open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }} direction="right">
      <DrawerContent className="w-full sm:max-w-xl h-full flex flex-col">
        <DrawerHeader className="border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DrawerTitle className="text-lg" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Upload Catalog
              </DrawerTitle>
              <DrawerDescription className="text-sm mt-1">
                Import your product catalog as CSV or Excel
              </DrawerDescription>
            </div>
            <DrawerClose asChild>
              <button className="text-gray-400 hover:text-gray-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Drop zone */}
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
              isDragging
                ? 'border-[#A5CFDD] bg-[#A5CFDD]/10'
                : selectedFile
                ? 'border-green-300 bg-green-50'
                : 'border-[#A5CFDD]/50 hover:border-[#A5CFDD] bg-gray-50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
            />

            {selectedFile ? (
              <div className="space-y-2">
                <FileUp className="w-10 h-10 text-green-500 mx-auto" />
                <p className="text-sm font-medium text-[#2A2A2A]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  {selectedFile.name}
                </p>
                <p className="text-xs text-gray-400">
                  {(selectedFile.size / 1024).toFixed(1)} KB {estimatedRows ? `· ${estimatedRows}` : ''}
                </p>
                <button
                  className="text-xs text-[#A5CFDD] hover:underline mt-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                    setUploadResult(null);
                    setUploadedCatalog(null);
                  }}
                >
                  Choose a different file
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <Upload className="w-10 h-10 text-[#A5CFDD] mx-auto" />
                <div>
                  <p className="text-sm font-medium text-[#2A2A2A]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Drag and drop your catalog file here
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    or <span className="text-[#A5CFDD] hover:underline">browse</span> to select
                  </p>
                </div>
                <p className="text-xs text-gray-400">
                  Supports CSV, XLSX, XLS
                </p>
              </div>
            )}
          </div>

          {/* Upload result */}
          {uploadResult && (
            <div className={`rounded-lg p-4 flex flex-col gap-2 ${
              uploadResult.isError ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
            }`}>
              <div className="flex items-start gap-3">
                {uploadResult.isError ? (
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                ) : (
                  <Check className="w-5 h-5 flex-shrink-0 mt-0.5" />
                )}
                <p className="text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  {uploadResult.message}
                </p>
              </div>
              {uploadResult.debug && (
                <details className="text-xs mt-2">
                  <summary className="cursor-pointer font-medium">Debug info</summary>
                  <div className="mt-2 space-y-2 bg-white/50 rounded p-3 text-gray-700">
                    <div>
                      <p className="font-medium">Detected headers:</p>
                      <p className="text-[11px] break-all">{uploadResult.debug.headers?.join(', ')}</p>
                    </div>
                    <div>
                      <p className="font-medium">Column mapping:</p>
                      <pre className="text-[11px] whitespace-pre-wrap">{JSON.stringify(uploadResult.debug.column_mapping, null, 2)}</pre>
                    </div>
                    {uploadResult.debug.sample_row && (
                      <div>
                        <p className="font-medium">First row (raw):</p>
                        <p className="text-[11px] break-all">{uploadResult.debug.sample_row.raw?.join(' | ')}</p>
                        <p className="font-medium mt-1">First row (parsed):</p>
                        <pre className="text-[11px] whitespace-pre-wrap">{JSON.stringify(uploadResult.debug.sample_row.parsed, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </div>
          )}

          {/* Required columns info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-[#2A2A2A] mb-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Required Columns
            </h3>
            <div className="space-y-2">
              {[
                { field: 'Item Number', desc: 'SKU or product code', required: true },
                { field: 'Product Name', desc: 'Product description', required: true },
                { field: 'Brand', desc: 'Manufacturer or brand name', required: true },
                { field: 'Pack Size', desc: 'e.g. 6/10#, 4/1 GAL', required: true },
                { field: 'Category', desc: 'Product category', required: false },
                { field: 'Price', desc: 'Unit price', required: false },
              ].map((col) => (
                <div key={col.field} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-[#2A2A2A] font-medium">{col.field}</span>
                    {col.required && (
                      <span className="text-[10px] bg-[#F2993D]/10 text-[#F2993D] px-1.5 py-0.5 rounded font-medium">
                        Required
                      </span>
                    )}
                  </div>
                  <span className="text-gray-400">{col.desc}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 mt-3">
              Column headers are auto-mapped — exact names not required
            </p>
          </div>
        </div>

        <DrawerFooter className="border-t border-gray-200 flex-shrink-0">
          {uploadedCatalog ? (
            <Button
              onClick={handleClose}
              className="w-full bg-[#F2993D] hover:bg-[#E08A2E] text-white"
            >
              <Check className="w-4 h-4 mr-2" />
              Done — {uploadedCatalog.item_count} Products Imported
            </Button>
          ) : (
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="w-full bg-[#F2993D] hover:bg-[#E08A2E] text-white disabled:bg-gray-200 disabled:text-gray-400"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Catalog
                </>
              )}
            </Button>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
