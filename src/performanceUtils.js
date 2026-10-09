/**
 * Performance Optimization Utilities for MyKipenzi
 */

import { useEffect, useRef, useCallback, useMemo, useState, lazy, Suspense } from 'react';

/**
 * Virtual Scrolling Hook
 * Renders only visible items in a large list for better performance
 */
export function useVirtualScroll({
  items,
  itemHeight,
  containerHeight,
  overscan = 5,
}) {
  const scrollPosition = useRef(0);
  const visibleStart = Math.max(0, Math.floor(scrollPosition.current / itemHeight) - overscan);
  const visibleEnd = Math.min(
    items.length,
    Math.ceil((scrollPosition.current + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = items.slice(visibleStart, visibleEnd).map((item, index) => ({
    ...item,
    index: visibleStart + index,
    style: {
      position: 'absolute',
      top: `${(visibleStart + index) * itemHeight}px`,
      height: `${itemHeight}px`,
    },
  }));

  const totalHeight = items.length * itemHeight;

  const onScroll = useCallback((event) => {
    scrollPosition.current = event.target.scrollTop;
  }, []);

  return {
    visibleItems,
    totalHeight,
    onScroll,
  };
}

/**
 * Intersection Observer Hook
 * Lazy load images and content as they come into view
 */
export function useIntersectionObserver(callback, options = {}) {
  const targetRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          callback(entry);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '50px',
      ...options,
    });

    const currentTarget = targetRef.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [callback, options]);

  return targetRef;
}

/**
 * Lazy Image Component
 * Only loads image when it comes into view
 */
export function LazyImage({ src, alt, className, placeholder, ...props }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useIntersectionObserver(() => setIsInView(true));

  return (
    <div ref={imgRef} className={`lazy-image-wrapper ${className || ''}`}>
      {!isLoaded && placeholder && (
        <div className="lazy-image-placeholder">{placeholder}</div>
      )}
      {isInView && (
        <img
          src={src}
          alt={alt}
          onLoad={() => setIsLoaded(true)}
          style={{ opacity: isLoaded ? 1 : 0 }}
          {...props}
        />
      )}
    </div>
  );
}

/**
 * Debounce Hook
 * Delays execution of a function until user stops typing/acting
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Throttle Hook
 * Limits how often a function can be called
 */
export function useThrottle(callback, delay = 300) {
  const lastRun = useRef(Date.now());

  return useCallback(
    (...args) => {
      const now = Date.now();
      if (now - lastRun.current >= delay) {
        callback(...args);
        lastRun.current = now;
      }
    },
    [callback, delay]
  );
}

/**
 * Image Compression Utility
 * Compress images before upload
 */
export async function compressImage(file, maxWidth = 1920, maxHeight = 1920, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            resolve(
              new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now(),
              })
            );
          },
          file.type,
          quality
        );
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
}

/**
 * Memoized Component Helper
 * Prevents unnecessary re-renders
 */
export function useMemoizedCallback(callback, dependencies) {
  return useCallback(callback, dependencies);
}

export function useMemoizedValue(factory, dependencies) {
  return useMemo(factory, dependencies);
}

/**
 * Local Storage Cache with Expiration
 */
export class CacheStore {
  constructor(prefix = 'kipenzi_cache_') {
    this.prefix = prefix;
  }

  set(key, value, ttl = 3600000) {
    // ttl in milliseconds, default 1 hour
    const item = {
      value,
      expiry: Date.now() + ttl,
    };
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(item));
    } catch (e) {
      console.warn('Cache storage failed:', e);
    }
  }

  get(key) {
    try {
      const itemStr = localStorage.getItem(this.prefix + key);
      if (!itemStr) return null;

      const item = JSON.parse(itemStr);
      if (Date.now() > item.expiry) {
        localStorage.removeItem(this.prefix + key);
        return null;
      }

      return item.value;
    } catch (e) {
      return null;
    }
  }

  remove(key) {
    localStorage.removeItem(this.prefix + key);
  }

  clear() {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith(this.prefix)) {
        localStorage.removeItem(key);
      }
    });
  }
}

/**
 * Request Batching
 * Batch multiple API requests into one
 */
export class RequestBatcher {
  constructor(batchFn, delay = 50) {
    this.batchFn = batchFn;
    this.delay = delay;
    this.queue = [];
    this.timer = null;
  }

  add(request) {
    return new Promise((resolve, reject) => {
      this.queue.push({ request, resolve, reject });
      
      if (this.timer) clearTimeout(this.timer);
      
      this.timer = setTimeout(() => {
        this.flush();
      }, this.delay);
    });
  }

  async flush() {
    if (this.queue.length === 0) return;

    const batch = this.queue.splice(0);
    const requests = batch.map((item) => item.request);

    try {
      const results = await this.batchFn(requests);
      batch.forEach((item, index) => {
        item.resolve(results[index]);
      });
    } catch (error) {
      batch.forEach((item) => {
        item.reject(error);
      });
    }
  }
}

/**
 * Code Splitting Helper
 * Lazy load components
 */
export function lazyLoad(importFn, fallback = null) {
  const LazyComponent = lazy(importFn);
  
  return function LazyLoadedComponent(props) {
    return (
      <Suspense fallback={fallback || <div>Loading...</div>}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

/**
 * Performance Monitor
 * Track component render times
 */
export function usePerformanceMonitor(componentName) {
  useEffect(() => {
    const start = performance.now();
    return () => {
      const end = performance.now();
      const renderTime = end - start;
      if (renderTime > 16) {
        // Log slow renders (> 16ms)
        console.warn(`${componentName} took ${renderTime.toFixed(2)}ms to render`);
      }
    };
  });
}

/**
 * Efficient List Update
 * Only update changed items in a list
 */
export function efficientListUpdate(oldList, newList, keyFn = (item) => item.id) {
  const oldMap = new Map(oldList.map((item) => [keyFn(item), item]));
  const newMap = new Map(newList.map((item) => [keyFn(item), item]));

  const added = newList.filter((item) => !oldMap.has(keyFn(item)));
  const removed = oldList.filter((item) => !newMap.has(keyFn(item)));
  const updated = newList.filter((item) => {
    const key = keyFn(item);
    return oldMap.has(key) && JSON.stringify(oldMap.get(key)) !== JSON.stringify(item);
  });

  return { added, removed, updated };
}

/**
 * Memory Usage Monitor
 */
export function getMemoryUsage() {
  if (performance.memory) {
    return {
      used: (performance.memory.usedJSHeapSize / 1048576).toFixed(2) + ' MB',
      total: (performance.memory.totalJSHeapSize / 1048576).toFixed(2) + ' MB',
      limit: (performance.memory.jsHeapSizeLimit / 1048576).toFixed(2) + ' MB',
    };
  }
  return null;
}

export default {
  useVirtualScroll,
  useIntersectionObserver,
  LazyImage,
  useDebounce,
  useThrottle,
  compressImage,
  useMemoizedCallback,
  useMemoizedValue,
  CacheStore,
  RequestBatcher,
  lazyLoad,
  usePerformanceMonitor,
  efficientListUpdate,
  getMemoryUsage,
};
