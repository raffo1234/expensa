import { useState, useCallback } from "react";

interface UseCheckboxSelectionProps<T extends { id: string }> {
  getItemId?: (item: T) => T["id"];
}

function useCheckboxSelection<T extends { id: string }>({
  getItemId = (item) => item.id,
}: UseCheckboxSelectionProps<T> = {}) {
  const [selectedIds, setSelectedIds] = useState<Set<T["id"]>>(
    new Set<T["id"]>()
  );

  const isItemSelected = useCallback(
    (id: T["id"]) => selectedIds.has(id),
    [selectedIds]
  );

  const toggleItemSelected = useCallback(
    (id: T["id"]) => {
      const newSelectedIds = new Set(selectedIds);
      if (newSelectedIds.has(id)) {
        newSelectedIds.delete(id);
      } else {
        newSelectedIds.add(id);
      }
      setSelectedIds(newSelectedIds);
    },
    [selectedIds]
  );

  const handleSelectAllClick = useCallback(
    (items: T[]) => {
      if (selectedIds.size === items.length && items.length > 0) {
        setSelectedIds(new Set());
        return;
      }
      const newSelectedIds = new Set(items.map((item) => getItemId(item)));
      setSelectedIds(newSelectedIds);
    },
    [selectedIds, getItemId]
  );

  const isAllItemsSelected = useCallback(
    (items: T[]) =>
      items.length > 0 &&
      selectedIds.size === items.length &&
      items.every((item) => selectedIds.has(getItemId(item))),
    [selectedIds, getItemId]
  );

  const selectItem = useCallback((id: T["id"]) => {
    setSelectedIds((prevSelectedIds) => new Set(prevSelectedIds).add(id));
  }, []);

  const deselectItem = useCallback((id: T["id"]) => {
    setSelectedIds((prevSelectedIds) => {
      const newSet = new Set(prevSelectedIds);
      newSet.delete(id);
      return newSet;
    });
  }, []);

  const setSelected = useCallback((ids: Set<T["id"]>) => {
    setSelectedIds(ids);
  }, []);

  return {
    selectedIds,
    isItemSelected,
    toggleItemSelected,
    handleSelectAllClick,
    isAllItemsSelected,
    selectItem,
    deselectItem,
    setSelected,
  };
}

export default useCheckboxSelection;
