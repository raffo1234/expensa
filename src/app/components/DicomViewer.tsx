"use client";

import dynamic from "next/dynamic";
import useSWR from "swr";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

// 1. Interfaz extendida para reflejar la realidad del estándar
interface DicomInstance {
  storage_url: string;
  sop_instance_uid: string;
  series_instance_uid: string; // Crucial para el desempate
  instance_number: number;
}

interface DicomViewerProps {
  studyId: string;
}

/**
 * Lógica Senior: Ordenamiento jerárquico.
 * 1º Agrupamos por Serie: Evita que imágenes de diferentes planos se mezclen.
 * 2º Ordenamos por Instancia: Mantiene la continuidad anatómica.
 * 3º Desempate por SOP UID: Garantiza un renderizado determinista.
 */
const fetchStudyInstances = async (id: string): Promise<DicomInstance[]> => {
  const { data, error } = await supabase
    .from("dicom")
    .select("instances")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data || !data.instances) return [];

  const rawInstances = data.instances as DicomInstance[];

  return [...rawInstances].sort((a, b) => {
    // A. Comparación por Serie (Prioridad absoluta)
    // Si pertenecen a series distintas, las mantenemos separadas en el stack
    if (a.series_instance_uid !== b.series_instance_uid) {
      return a.series_instance_uid.localeCompare(b.series_instance_uid);
    }

    // B. Comparación por Número de Instancia (Dentro de la misma serie)
    const numA = Number(a.instance_number) || 0;
    const numB = Number(b.instance_number) || 0;

    if (numA !== numB) {
      return numA - numB;
    }

    // C. Desempate Final (SOP Instance UID)
    // En DICOM multiframe o adquisiciones simultáneas, esto garantiza orden fijo
    return a.sop_instance_uid.localeCompare(b.sop_instance_uid);
  });
};

const DicomViewerClient = dynamic(() => import("./DicomViewerClient"), {
  ssr: false,
  loading: () => (
    <div className="h-[650px] w-full bg-zinc-950 animate-pulse flex items-center justify-center rounded-xl border border-zinc-800">
      <span className="text-zinc-600 text-xs font-mono uppercase tracking-widest">
        Inicializando motor DICOM...
      </span>
    </div>
  ),
});

export default function DicomViewer({ studyId }: DicomViewerProps) {
  const {
    data: instances,
    error,
    isLoading,
  } = useSWR(studyId ? `dicom-stack-${studyId}` : null, () => fetchStudyInstances(studyId), {
    revalidateIfStale: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 1000 * 60 * 60, // 1h cache
  });

  // Warm-up del cache del navegador (Estrategia de precarga de binarios)
  useEffect(() => {
    if (!instances || instances.length === 0) return;

    // Priorizamos los extremos del stack (donde suele empezar la navegación)
    const priorityInstances = [...instances.slice(0, 10), ...instances.slice(-10)];

    priorityInstances.forEach((inst) => {
      const link = document.createElement("link");
      link.rel = "prefetch";
      link.as = "fetch";
      link.href = inst.storage_url;
      document.head.appendChild(link);
    });
  }, [instances]);

  if (error) {
    return (
      <div className="h-[650px] flex flex-col items-center justify-center border border-red-900/20 bg-red-950/5 rounded-xl text-red-500 gap-2">
        <span className="text-[10px] font-mono uppercase opacity-50">Error de Red</span>
        <span className="text-xs font-mono">{error.message}</span>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-[650px] w-full bg-zinc-950 flex items-center justify-center rounded-xl border border-zinc-800">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-10 h-10 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <div className="space-y-1">
            <p className="text-zinc-400 text-[10px] font-mono uppercase tracking-widest">
              Analizando estructura DICOM
            </p>
            <p className="text-zinc-600 text-[9px] font-mono">
              Verificando integridad de series e instancias...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative group overflow-hidden rounded-xl border border-zinc-800 bg-black">
      {/* Overlay de Metadatos del Stack */}
      <div className="absolute top-4 left-4 z-10 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-md border border-white/5 pointer-events-none transition-opacity group-hover:opacity-100">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-tighter">
              Imágenes
            </span>
            <span className="text-xs font-mono text-indigo-400 leading-none">
              {instances?.length || 0}
            </span>
          </div>
          <div className="h-6 w-[1px] bg-zinc-800" />
          <div className="flex flex-col">
            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-tighter">
              Status
            </span>
            <span className="text-[10px] font-mono text-emerald-500 leading-none underline decoration-emerald-500/30">
              READY
            </span>
          </div>
        </div>
      </div>

      <DicomViewerClient instances={instances || []} />
    </div>
  );
}
