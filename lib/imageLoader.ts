// Enhanced image loader for membership cards
export async function loadImageWithFallback(imageUrl: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    
    // Handle different URL formats
    let finalUrl = imageUrl;
    if (!imageUrl.startsWith('http') && !imageUrl.startsWith('/')) {
      finalUrl = `/${imageUrl}`;
    }
    
    // Set up timeout
    const timeout = setTimeout(() => {
      console.warn(`Image loading timeout for: ${finalUrl}`);
      resolve(null);
    }, 3000);
    
    img.onload = () => {
      clearTimeout(timeout);
      console.log(`Image loaded successfully: ${finalUrl}`);
      resolve(img);
    };
    
    img.onerror = (error) => {
      clearTimeout(timeout);
      console.warn(`Image failed to load: ${finalUrl}`, error);
      resolve(null);
    };
    
    // Try different approaches
    try {
      img.crossOrigin = 'anonymous';
      img.src = finalUrl;
    } catch (error) {
      console.warn(`Error setting image source: ${finalUrl}`, error);
      resolve(null);
    }
  });
}

// Alternative image loader using fetch and blob
export async function loadImageViaFetch(imageUrl: string): Promise<HTMLImageElement | null> {
  try {
    let finalUrl = imageUrl;
    if (!imageUrl.startsWith('http') && !imageUrl.startsWith('/')) {
      finalUrl = `/${imageUrl}`;
    }
    
    console.log(`Attempting to load image via fetch: ${finalUrl}`);
    
    const response = await fetch(finalUrl, {
      mode: 'cors',
      credentials: 'omit'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        console.log(`Image loaded via fetch: ${finalUrl}`);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        console.warn(`Image failed to load via fetch: ${finalUrl}`);
        resolve(null);
      };
      img.src = objectUrl;
    });
  } catch (error) {
    console.warn(`Fetch method failed for: ${imageUrl}`, error);
    return null;
  }
}

// Comprehensive image loader with multiple methods
export async function loadImageComprehensive(imageUrl: string): Promise<HTMLImageElement | null> {
  if (!imageUrl || imageUrl.trim() === '') {
    console.log('No image URL provided');
    return null;
  }
  
  console.log(`Starting comprehensive image loading for: ${imageUrl}`);
  
  // Method 1: Direct image loading
  let img = await loadImageWithFallback(imageUrl);
  if (img) return img;
  
  // Method 2: Fetch method
  img = await loadImageViaFetch(imageUrl);
  if (img) return img;
  
  // Method 3: Try with different URL formats
  const urlVariations = [
    imageUrl,
    `/${imageUrl}`,
    `${window.location.origin}${imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl}`,
    `${imageUrl.replace('/uploads/', '/public/uploads/')}`,
    `${imageUrl.replace('/public/', '/')}`,
  ];
  
  for (const url of urlVariations) {
    if (url === imageUrl) continue; // Skip the original URL
    console.log(`Trying URL variation: ${url}`);
    img = await loadImageWithFallback(url);
    if (img) return img;
  }
  
  console.warn(`All image loading methods failed for: ${imageUrl}`);
  return null;
}
