"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  RenderingEngine,
  Enums,
  init as initCore,
  Types,
  imageLoadPoolManager,
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
// @ts-expect-error - El cargador de imágenes no tiene tipos oficiales completos en v4 aún
import { init as initDicomImageLoader } from "@cornerstonejs/dicom-image-loader";

let initialized = false;

async function initCornerstone() {
  if (initialized) return;
  await initCore();
  await initTools();
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

// ✅ Definición estricta de la interfaz de la instancia
interface Instance {
  instance_number: number;
  storage_url: string;
  // Puedes añadir más campos según tu base de datos de Supabase
  series_instance_uid?: string;
  sop_instance_uid?: string;
}

interface DicomViewerProps {
  instances: Instance[] | undefined;
}

export default function DicomViewerClient({ instances }: DicomViewerProps) {
  const leftRef = useRef<HTMLDivElement | null>(null);
  const rightRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<RenderingEngine | null>(null);

  // IDs tipados como constantes literales para evitar errores de string
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

      if (!engineRef.current) {
        engineRef.current = new RenderingEngine(ids.engine);

        const viewportInput: Types.PublicViewportInput[] = [
          {
            viewportId: ids.left,
            type: Enums.ViewportType.STACK,
            element: leftRef.current!,
          },
          {
            viewportId: ids.right,
            type: Enums.ViewportType.STACK,
            element: rightRef.current!,
          },
        ];

        engineRef.current.setViewports(viewportInput);

        let toolGroup = ToolGroupManager.getToolGroup(ids.group);
        if (!toolGroup) {
          toolGroup = ToolGroupManager.createToolGroup(ids.group);
          if (toolGroup) {
            [StackScrollTool, WindowLevelTool, PanTool, ZoomTool].forEach((t) =>
              toolGroup!.addTool(t.toolName),
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
      }

      // Casting a IStackViewport para acceder a métodos específicos como setStack
      const leftViewport = engineRef.current.getViewport(ids.left) as Types.IStackViewport;
      const rightViewport = engineRef.current.getViewport(ids.right) as Types.IStackViewport;

      if (leftViewport && rightViewport) {
        await Promise.all([leftViewport.setStack(imageIds), rightViewport.setStack(imageIds)]);

        // ⚡️ Activación de Prefetch (v4 utilities)
        csToolsUtils.stackPrefetch.enable(leftRef.current!);

        leftViewport.render();
        rightViewport.render();
      }
    };

    setup();

    return () => {
      cancelled = true;
      if (leftRef.current) {
        try {
          csToolsUtils.stackPrefetch.disable(leftRef.current);
        } catch (e) {
          console.warn("Error disabling prefetch", e);
        }
      }

      // ✅ Tipado correcto de Enums de Cornerstone
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
