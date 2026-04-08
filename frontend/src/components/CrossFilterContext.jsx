import React, { createContext, useContext, useState, useCallback } from 'react';

const CrossFilterContext = createContext(null);

/**
 * Provider quản lý cross-filter state cho toàn bộ dashboard.
 * Bọc quanh các component cần chia sẻ filter (Charts, Table, ...).
 */
export function CrossFilterProvider({ children }) {
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Toggle chọn/bỏ chọn — click cùng product lần 2 sẽ xóa filter
  const toggleProduct = useCallback((productName) => {
    setSelectedProduct(prev => prev === productName ? null : productName);
  }, []);

  // Xóa filter
  const clearFilter = useCallback(() => {
    setSelectedProduct(null);
  }, []);

  return (
    <CrossFilterContext.Provider value={{ selectedProduct, toggleProduct, clearFilter }}>
      {children}
    </CrossFilterContext.Provider>
  );
}

/**
 * Hook để các component con truy cập cross-filter state.
 * Sử dụng: const { selectedProduct, toggleProduct, clearFilter } = useCrossFilter();
 */
export function useCrossFilter() {
  const context = useContext(CrossFilterContext);
  if (!context) {
    throw new Error('useCrossFilter must be used within a <CrossFilterProvider>');
  }
  return context;
}
