export default function uploadFileToR2(
  url: string,
  file: File,
  onProgress: (progress: number) => void
) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url, true);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const progress = Math.round((event.loaded / event.total) * 100);
        console.warn(progress);
        onProgress(progress);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(true);
      } else {
        reject(xhr.statusText);
      }
    };

    xhr.onerror = () => {
      reject("Network Error");
    };

    xhr.send(file);
  });
}
