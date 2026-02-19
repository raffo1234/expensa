"use client";

import { useEffect, useMemo, useRef } from "react";
import { RenderingEngine, Enums, init as initCore, Types } from "@cornerstonejs/core";

import {
  init as initTools,
  addTool,
  ToolGroupManager,
  StackScrollTool,
  WindowLevelTool,
  PanTool,
  ZoomTool,
} from "@cornerstonejs/tools";
import { Enums as csToolsEnums } from "@cornerstonejs/tools";
// @ts-expect-error is not negatively impacting our code and avoids a big bundle size increase
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

type Instance = {
  instance_number: number;
  storage_url: string;
};

export default function DicomViewerClient({ instances }: { instances: Instance[] | undefined }) {
  const leftRef = useRef<HTMLDivElement | null>(null);
  const rightRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<RenderingEngine | null>(null);

  const renderingEngineId = useMemo(() => "engine-dual", []);
  const viewportLeftId = useMemo(() => "viewport-left", []);
  const viewportRightId = useMemo(() => "viewport-right", []);
  const toolGroupId = useMemo(() => "toolgroup-dual", []);

  const imageIds = useMemo(() => {
    if (!instances) return [];
    return [...instances]
      .sort((a, b) => Number(a.instance_number) - Number(b.instance_number))
      .map((inst) => `wadouri:${inst.storage_url}`);
  }, [instances]);

  useEffect(() => {
    if (!leftRef.current || !rightRef.current) return;
    if (!imageIds.length) return;

    let cancelled = false;

    const setup = async () => {
      await initCornerstone();
      if (cancelled) return;

      if (!engineRef.current) {
        engineRef.current = new RenderingEngine(renderingEngineId);

        engineRef.current.enableElement({
          viewportId: viewportLeftId,
          type: Enums.ViewportType.STACK,
          element: leftRef.current!,
        });

        engineRef.current.enableElement({
          viewportId: viewportRightId,
          type: Enums.ViewportType.STACK,
          element: rightRef.current!,
        });

        // 🔹 Crear toolGroup correctamente (VERSION SAFE)
        ToolGroupManager.createToolGroup(toolGroupId);
        const toolGroup = ToolGroupManager.getToolGroup(toolGroupId);

        if (!toolGroup) {
          throw new Error("ToolGroup not created correctly");
        }

        toolGroup.addTool(StackScrollTool.toolName);
        toolGroup.addTool(WindowLevelTool.toolName);
        toolGroup.addTool(PanTool.toolName);
        toolGroup.addTool(ZoomTool.toolName);

        toolGroup.addViewport(viewportLeftId, renderingEngineId);
        toolGroup.addViewport(viewportRightId, renderingEngineId);

        toolGroup.setToolActive(StackScrollTool.toolName, {
          bindings: [{ mouseButton: csToolsEnums.MouseBindings.Wheel }],
        });

        toolGroup.setToolActive(WindowLevelTool.toolName, {
          bindings: [{ mouseButton: csToolsEnums.MouseBindings.Primary }],
        });

        toolGroup.setToolActive(PanTool.toolName, {
          bindings: [{ mouseButton: csToolsEnums.MouseBindings.Auxiliary }],
        });
      }

      const engine = engineRef.current;

      const leftViewport = engine.getViewport(viewportLeftId) as Types.IStackViewport;

      const rightViewport = engine.getViewport(viewportRightId) as Types.IStackViewport;

      await leftViewport.setStack(imageIds);
      await rightViewport.setStack(imageIds);

      await leftViewport.setImageIdIndex(0);
      await rightViewport.setImageIdIndex(0);

      leftViewport.render();
      rightViewport.render();
    };

    setup();

    return () => {
      cancelled = true;
    };
  }, [imageIds]);

  return (
    <div className="grid grid-cols-2 gap-2 w-full h-[650px] bg-black">
      <div ref={leftRef} className="w-full h-full" tabIndex={0} style={{ outline: "none" }} />
      <div ref={rightRef} className="w-full h-full" tabIndex={0} style={{ outline: "none" }} />
    </div>
  );
}
