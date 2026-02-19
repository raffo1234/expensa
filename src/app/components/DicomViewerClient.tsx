"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  RenderingEngine,
  Enums,
  init as initCore,
  Types,
  imageLoadPoolManager,
  cache,
} from "@cornerstonejs/core";

import {
  init as initTools,
  addTool,
  ToolGroupManager,
  StackScrollTool,
  WindowLevelTool,
  PanTool,
  ZoomTool,
  utilities as csToolsUtils,
} from "@cornerstonejs/tools";
import { Enums as csToolsEnums } from "@cornerstonejs/tools";
// @ts-expect-error - Loader types are still evolving in v4
import { init as initDicomImageLoader } from "@cornerstonejs/dicom-image-loader";

let initialized = false;

async function initCornerstone() {
  if (initialized) return;
  await initCore();
  await initTools();

  // Configuración de alto rendimiento para el cargador
  await initDicomImageLoader({
    maxWebWorkers: navigator.hardwareConcurrency || 4,
    startWebWorkersOnDemand: true,
  });

  [StackScrollTool, WindowLevelTool, PanTool, ZoomTool].forEach((tool) => {
    try {
      addTool(tool);
    } catch {}
  });
  initialized = true;
}

interface Instance {
  instance_number: number;
  storage_url: string;
}

export default function DicomViewerClient({ instances }: { instances: Instance[] | undefined }) {
  const leftRef = useRef<HTMLDivElement | null>(null);
  const rightRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<RenderingEngine | null>(null);

  const ids = useMemo(
    () => ({
      engine: "engine-dual" as const,
      left: "viewport-left" as const,
      right: "viewport-right" as const,
      group: "toolgroup-dual" as const,
    }),
    [],
  );

  const imageIds = useMemo((): string[] => {
    if (!instances) return [];
    return [...instances]
      .sort((a, b) => Number(a.instance_number) - Number(b.instance_number))
      .map((inst) => `wadouri:${inst.storage_url}`);
  }, [instances]);

  useEffect(() => {
    if (!leftRef.current || !rightRef.current || !imageIds.length) return;

    let cancelled = false;

    const setup = async () => {
      await initCornerstone();
      if (cancelled) return;

      // 1. Gestión de Memoria: Limitar caché para evitar crashes en estudios grandes
      // 1GB es un estándar seguro para navegadores modernos
      cache.setMaxCacheSize(1024 * 1024 * 1024);

      if (!engineRef.current) {
        engineRef.current = new RenderingEngine(ids.engine);

        engineRef.current.setViewports([
          { viewportId: ids.left, type: Enums.ViewportType.STACK, element: leftRef.current! },
          { viewportId: ids.right, type: Enums.ViewportType.STACK, element: rightRef.current! },
        ]);

        const toolGroup = ToolGroupManager.createToolGroup(ids.group);
        if (toolGroup) {
          [StackScrollTool, WindowLevelTool, PanTool, ZoomTool].forEach((t) =>
            toolGroup.addTool(t.toolName),
          );
          toolGroup.addViewport(ids.left, ids.engine);
          toolGroup.addViewport(ids.right, ids.engine);
          toolGroup.setToolActive(StackScrollTool.toolName, {
            bindings: [{ mouseButton: csToolsEnums.MouseBindings.Wheel }],
          });
          toolGroup.setToolActive(WindowLevelTool.toolName, {
            bindings: [{ mouseButton: csToolsEnums.MouseBindings.Primary }],
          });
        }
      }

      const leftViewport = engineRef.current.getViewport(ids.left) as Types.IStackViewport;
      const rightViewport = engineRef.current.getViewport(ids.right) as Types.IStackViewport;

      await Promise.all([leftViewport.setStack(imageIds), rightViewport.setStack(imageIds)]);

      // ⚡️ CONFIGURACIÓN PREFETCH v4 (TikTok Mode)
      // Verificado: En v4 setConfiguration es el método para pasar las opciones
      csToolsUtils.stackPrefetch.setConfiguration({
        maxImagesToPrefetch: Infinity,
        preservePreFetchedImages: true,
        // Proximity garantiza que el buffer se llene alrededor del scroll actual
        prefetchStrategy: "proximity",
      });

      // Solo pasamos el elemento como requiere la firma de enable()
      csToolsUtils.stackPrefetch.enable(leftRef.current!);

      leftViewport.render();
      rightViewport.render();
    };

    setup();

    return () => {
      cancelled = true;
      if (leftRef.current) {
        try {
          csToolsUtils.stackPrefetch.disable(leftRef.current);
        } catch {}
      }

      // ✅ Limpieza agresiva de red para liberar ancho de banda al instante
      imageLoadPoolManager.clearRequestStack(Enums.RequestType.Prefetch);
      imageLoadPoolManager.clearRequestStack(Enums.RequestType.Interaction);

      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
    };
  }, [imageIds, ids]);

  return (
    <div className="grid grid-cols-2 gap-2 w-full h-[650px] bg-black border border-zinc-800 rounded-md overflow-hidden">
      <div
        ref={leftRef}
        className="w-full h-full relative"
        tabIndex={0}
        style={{ outline: "none" }}
      />
      <div
        ref={rightRef}
        className="w-full h-full relative border-l border-zinc-800"
        tabIndex={0}
        style={{ outline: "none" }}
      />
    </div>
  );
}
