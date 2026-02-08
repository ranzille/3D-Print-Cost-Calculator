
import JSZip from 'jszip';

export interface GCodeResult {
  hours: number;
  minutes: number;
  grams: number;
  found: boolean;
  filename?: string;
}

// Worker Code as a string
const WORKER_CODE = `
self.onmessage = function(e) {
  const text = e.data;
  const result = {
    hours: 0,
    minutes: 0,
    grams: 0,
    found: false
  };

  // 1. Bambu Lab Logic
  // Pattern: "; total estimated time: 11h 36m 26s"
  // Pattern: "; total filament weight [g] : 297.61"
  const timeRegexBambu = /total estimated time\\s*[:=]\\s*(?:(\\d+)d\\s*)?(?:(\\d+)h\\s*)?(?:(\\d+)m\\s*)?/;
  const weightRegexBambu = /total filament weight \\[g\\]\\s*[:=]\\s*(\\d+\\.?\\d*)/;

  // 2. Prusa Logic
  // Pattern: "; estimated printing time = 5h 23m 10s"
  // Pattern: "; filament used [g] = 297.61"
  const timeRegexPrusa = /estimated printing time\\s*=\\s*(?:(\\d+)d\\s*)?(?:(\\d+)h\\s*)?(?:(\\d+)m\\s*)?/;
  const weightRegexPrusa = /filament used \\[g\\]\\s*=\\s*(\\d+\\.?\\d*)/;

  // 3. OrcaSlicer / Misc
  // Pattern: "; estimated printing time: 1h 2m 3s"
  const timeRegexGeneric = /estimated printing time\\s*[:=]\\s*(?:(\\d+)d\\s*)?(?:(\\d+)h\\s*)?(?:(\\d+)m\\s*)?/;
  
  // Time Extraction
  let timeMatch = text.match(timeRegexBambu) || text.match(timeRegexPrusa) || text.match(timeRegexGeneric);
  
  if (timeMatch) {
    let d = parseInt(timeMatch[1] || '0');
    let h = parseInt(timeMatch[2] || '0');
    let m = parseInt(timeMatch[3] || '0');
    h += d * 24; 
    
    result.hours = h;
    result.minutes = m;
    result.found = true;
  }

  // Weight Extraction
  let weightMatch = text.match(weightRegexBambu) || text.match(weightRegexPrusa);
  
  if (weightMatch) {
    result.grams = parseFloat(weightMatch[1]);
    result.found = true;
  }

  self.postMessage(result);
};
`;

const createWorker = () => {
  const blob = new Blob([WORKER_CODE], { type: 'application/javascript' });
  return new Worker(URL.createObjectURL(blob));
};

export const parseGCodeFile = async (file: File): Promise<GCodeResult> => {
  return new Promise(async (resolve, reject) => {
    let textContent = '';

    try {
      if (file.name.toLowerCase().endsWith('.3mf')) {
        // Handle 3MF: Unzip and look for gcode or metadata
        try {
          const zip = await JSZip.loadAsync(file);
          
          // Strategy 1: Look for embedded G-code (Bambu often puts it in Metadata or root)
          // Strategy 2: Look for Slice Info (Bambu)
          // Strategy 3: Iterate all files looking for .gcode extension
          
          let foundFile = null;
          
          // Check common Bambu locations
          const sliceInfo = zip.file('Metadata/slice_info.config');
          if (sliceInfo) {
             textContent = await sliceInfo.async('string');
             // slice_info.config is XML but contains similar keys if we are lucky, 
             // or we just parse it as text for the keys we know.
             // Actually, slice_info.config usually has keys like <header>... </header>
             // Let's rely on the worker regexes, they might hit if the format is text-based enough.
             // If not, we look for 'plate_1.gcode' inside the zip.
          }
          
          if (!textContent) {
             // Look for any .gcode file
             zip.forEach((relativePath, zipEntry) => {
               if (relativePath.endsWith('.gcode')) {
                 foundFile = zipEntry;
               }
             });
             
             if (foundFile) {
               // @ts-ignore
               textContent = await foundFile.async('string');
             }
          }
          
          if (!textContent) {
            // Fallback: Try reading the whole model_settings.config
             const modelSettings = zip.file('Metadata/model_settings.config');
             if (modelSettings) textContent = await modelSettings.async('string');
          }

        } catch (err) {
          console.error("3MF Parse Error", err);
          // Fallback to treating as text if zip fails? Unlikely to work.
        }
      } else {
        // Standard GCode / Text
        textContent = await file.text();
      }

      if (!textContent) {
        resolve({ hours: 0, minutes: 0, grams: 0, found: false });
        return;
      }

      // Offload Regex to Worker
      const worker = createWorker();
      worker.onmessage = (e) => {
        resolve({ ...e.data, filename: file.name });
        worker.terminate();
      };
      worker.onerror = (e) => {
        console.error("Worker Error", e);
        reject(e);
        worker.terminate();
      };
      
      worker.postMessage(textContent);

    } catch (e) {
      reject(e);
    }
  });
};