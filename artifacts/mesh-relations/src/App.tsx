import { type PointerEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { ClerkProvider, Show, SignIn, SignUp, useClerk, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  ChevronDown,
  CircleHelp,
  FilePlus2,
  GitBranch,
  LogOut,
  MousePointer2,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import {
  createDiagram,
  deleteDiagram,
  getDiagram,
  listDiagrams,
  updateDiagram,
  type DiagramSummary,
} from '@/lib/diagrams';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  Route,
  Redirect,
  Switch,
  Link,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: '#2d7164',
    colorForeground: '#183b37',
    colorMutedForeground: '#6b8179',
    colorDanger: '#bd5f55',
    colorBackground: '#fbf8f0',
    colorInput: '#f5f2ea',
    colorInputForeground: '#183b37',
    colorNeutral: '#d6d0c2',
    fontFamily: 'Manrope, sans-serif',
    borderRadius: '0.75rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-[#fbf8f0] rounded-2xl w-[440px] max-w-full overflow-hidden shadow-[0_24px_70px_rgba(24,59,55,.16)]',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-[#183b37] font-serif text-3xl',
    headerSubtitle: 'text-[#6b8179]',
    socialButtonsBlockButtonText: 'text-[#315e53] font-semibold',
    formFieldLabel: 'text-[#315e53] font-semibold',
    footerActionLink: 'text-[#2d7164] font-semibold',
    footerActionText: 'text-[#6b8179]',
    dividerText: 'text-[#8aa097]',
    identityPreviewEditButton: 'text-[#2d7164]',
    formFieldSuccessText: 'text-[#2d7164]',
    alertText: 'text-[#bd5f55]',
    logoBox: 'h-12',
    logoImage: 'max-h-12',
    socialButtonsBlockButton: 'border-[#d6d0c2] bg-[#f5f2ea] hover:bg-[#edf2ea]',
    formButtonPrimary: 'bg-[#2d7164] hover:bg-[#245e54] text-[#fff8ea]',
    formFieldInput: 'border-[#d6d0c2] bg-[#f5f2ea] text-[#183b37]',
    footerAction: 'bg-transparent',
    dividerLine: 'bg-[#d6d0c2]',
    alert: 'bg-[#fbebe8] border-[#e8b9b2]',
    otpCodeFieldInput: 'border-[#d6d0c2] bg-[#f5f2ea] text-[#183b37]',
    formFieldRow: 'gap-1',
    main: 'bg-transparent',
  },
};

type Relation = 'neutral' | 'negative' | 'positive';

type MeshNode = {
  id: string;
  name: string;
  imageUrl: string | null;
  x: number;
  y: number;
};

type MeshEdge = {
  id: string;
  source: MeshNode;
  target: MeshNode;
  relation: Relation;
};

const initialNode: MeshNode = {
  id: 'node-origin',
  name: 'Origin',
  imageUrl: null,
  x: 50,
  y: 50,
};

const relationOrder: Relation[] = ['neutral', 'negative', 'positive'];
const placementPoints = [
  [27, 28],
  [73, 30],
  [25, 70],
  [75, 70],
  [50, 19],
  [50, 81],
  [17, 50],
  [83, 50],
];

function edgeId(firstId: string, secondId: string) {
  return [firstId, secondId].sort().join('::');
}

function relationLabel(relation: Relation) {
  if (relation === 'positive') return 'Positive';
  if (relation === 'negative') return 'Negative';
  return 'Neutral';
}

function relationTone(relation: Relation) {
  if (relation === 'positive') return 'var(--positive)';
  if (relation === 'negative') return 'var(--negative)';
  return 'var(--neutral)';
}

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#f3f0e8] px-4 py-8">
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
      />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#f3f0e8] px-4 py-8">
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
      />
    </div>
  );
}

function LandingPage() {
  return (
    <main className="mesh-noise min-h-[100dvh] bg-[#f3f0e8] text-[#183b37]">
      <div className="mx-auto flex min-h-[100dvh] max-w-6xl flex-col px-6 py-7 md:px-10 md:py-10">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f3a17f] text-[#183b37] shadow-[0_6px_16px_rgba(243,161,127,.2)]">
              <GitBranch size={19} strokeWidth={2.4} />
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#74958a]">Workspace</p>
              <h1 className="font-serif text-[24px] leading-none tracking-[-0.03em]">Mesh Relations</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/sign-in"
              className="rounded-lg px-3.5 py-2 text-[11px] font-bold text-[#315e53] transition hover:bg-[#e8eee6]"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="rounded-lg bg-[#2d7164] px-3.5 py-2.5 text-[11px] font-bold text-[#fff8ea] shadow-[0_5px_12px_rgba(45,113,100,.18)] transition hover:bg-[#245e54]"
            >
              Create account
            </Link>
          </div>
        </header>

        <div className="grid flex-1 items-center gap-12 py-16 lg:grid-cols-[.95fr_1.05fr] lg:gap-20">
          <section className="max-w-xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#74958a]">A workspace for connected thinking</p>
            <h2 className="mt-5 max-w-lg font-serif text-[clamp(3.4rem,7vw,6.5rem)] leading-[.9] tracking-[-0.055em] text-[#183b37]">
              See the shape of your network.
            </h2>
            <p className="mt-7 max-w-md text-[15px] leading-[1.7] text-[#688278]">
              Add nodes, map their connections, and mark each relationship as neutral, negative, or positive.
            </p>
            <Link
              href="/sign-up"
              className="mt-8 inline-flex items-center gap-2 rounded-lg bg-[#f0a080] px-5 py-3 text-[12px] font-bold text-[#25473f] shadow-[0_7px_16px_rgba(240,160,128,.2)] transition hover:bg-[#f3b091]"
            >
              Start mapping <span aria-hidden="true">→</span>
            </Link>
          </section>

          <div className="relative min-h-[360px] overflow-hidden rounded-[28px] border border-[#d8d4c9] bg-[#eeeae0] shadow-[inset_0_1px_0_rgba(255,255,255,.65)]">
            <div className="mesh-grid absolute inset-0 opacity-80" />
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <line x1="26" y1="34" x2="55" y2="54" stroke="#7faaa0" strokeWidth=".55" strokeDasharray="1.5 1.4" />
              <line x1="55" y1="54" x2="76" y2="30" stroke="#ee8273" strokeWidth=".75" />
              <line x1="55" y1="54" x2="73" y2="76" stroke="#8ec8b6" strokeWidth=".75" />
            </svg>
            {[
              { name: 'A', x: '26%', y: '34%', tone: 'border-[#d8b39f] bg-[#f8f3e8] text-[#286255]' },
              { name: 'B', x: '55%', y: '54%', tone: 'border-[#f1a17f] bg-[#2f7668] text-[#fff8ea]' },
              { name: 'C', x: '76%', y: '30%', tone: 'border-[#d8b39f] bg-[#f8f3e8] text-[#286255]' },
              { name: 'D', x: '73%', y: '76%', tone: 'border-[#d8b39f] bg-[#f8f3e8] text-[#286255]' },
            ].map((node) => (
              <div
                key={node.name}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: node.x, top: node.y }}
              >
                <div className={`flex h-14 w-14 items-center justify-center rounded-full border-[3px] text-[13px] font-bold shadow-[0_8px_15px_rgba(35,69,61,.13)] ${node.tone}`}>
                  {node.name}
                </div>
              </div>
            ))}
            <p className="absolute bottom-5 left-6 font-mono text-[9px] uppercase tracking-[.14em] text-[#789188]">Neutral · Negative · Positive</p>
          </div>
        </div>
      </div>
    </main>
  );
}

function AccountControl() {
  const { signOut } = useClerk();
  const { user } = useUser();
  const displayName = user?.firstName || user?.username || user?.primaryEmailAddress?.emailAddress || 'Account';
  const initials = displayName.slice(0, 1).toUpperCase();

  return (
    <div className="flex items-center gap-2 rounded-lg border border-[#d6d0c2] bg-[#f7f4ed] px-2 py-1.5">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#dcece4] font-mono text-[10px] font-bold text-[#2d7164]">{initials}</span>
      <span className="hidden max-w-[110px] truncate text-[11px] font-semibold text-[#315e53] sm:block">{displayName}</span>
      <button
        type="button"
        onClick={() => signOut({ redirectUrl: basePath || '/' })}
        className="flex h-6 w-6 items-center justify-center rounded-md text-[#789188] transition hover:bg-[#edf0e8] hover:text-[#315e53]"
        aria-label="Sign out"
      >
        <LogOut size={13} />
      </button>
    </div>
  );
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/workspace" />
      </Show>
      <Show when="signed-out">
        <LandingPage />
      </Show>
    </>
  );
}

function WorkspacePage() {
  return (
    <>
      <Show when="signed-in">
        <Home />
      </Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const previousUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        previousUserIdRef.current !== undefined &&
        previousUserIdRef.current !== userId
      ) {
        queryClient.clear();
      }
      previousUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener]);

  return null;
}

function Home() {
  const [nodes, setNodes] = useState<MeshNode[]>([initialNode]);
  const [relations, setRelations] = useState<Record<string, Relation>>({});
  const [diagramId, setDiagramId] = useState<string | null>(null);
  const [diagramName, setDiagramName] = useState('Untitled mesh');
  const [savedDiagrams, setSavedDiagrams] = useState<DiagramSummary[]>([]);
  const [isLoadingDiagrams, setIsLoadingDiagrams] = useState(true);
  const [isOpeningDiagram, setIsOpeningDiagram] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavePanelOpen, setIsSavePanelOpen] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState(initialNode.id);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const panRef = useRef(pan);
  const nodeMoveFrameRef = useRef<number | null>(null);
  const latestNodePointRef = useRef<{ nodeId: string; clientX: number; clientY: number } | null>(null);
  const panFrameRef = useRef<number | null>(null);
  const latestPanPointRef = useRef<{ clientX: number; clientY: number } | null>(null);
  const panStartRef = useRef<{ clientX: number; clientY: number; x: number; y: number } | null>(null);
  const idCounter = useRef(1);

  const edges = useMemo<MeshEdge[]>(() => {
    const nextEdges: MeshEdge[] = [];
    for (let sourceIndex = 0; sourceIndex < nodes.length; sourceIndex += 1) {
      for (let targetIndex = sourceIndex + 1; targetIndex < nodes.length; targetIndex += 1) {
        const source = nodes[sourceIndex];
        const target = nodes[targetIndex];
        const id = edgeId(source.id, target.id);
        nextEdges.push({
          id,
          source,
          target,
          relation: relations[id] ?? 'neutral',
        });
      }
    }
    return nextEdges;
  }, [nodes, relations]);

  const selectedNode = nodes.find((node) => node.id === selectedId) ?? nodes[0];
  const selectedEdge = edges.find((edge) => edge.id === selectedEdgeId) ?? null;
  const positiveCount = edges.filter((edge) => edge.relation === 'positive').length;
  const negativeCount = edges.filter((edge) => edge.relation === 'negative').length;

  const applyDiagram = (diagram: {
    id: string;
    name: string;
    nodes: MeshNode[];
    relations: Record<string, Relation>;
  }) => {
    setDiagramId(diagram.id);
    setDiagramName(diagram.name);
    setNodes(diagram.nodes);
    setRelations(diagram.relations);
    setSelectedId(diagram.nodes[0]?.id ?? initialNode.id);
    setSelectedEdgeId(null);
    setPan({ x: 0, y: 0 });
    panRef.current = { x: 0, y: 0 };
    const numericIds = diagram.nodes
      .map((node) => Number(node.id.match(/^node-(\d+)$/)?.[1] ?? 0))
      .filter(Number.isFinite);
    idCounter.current = Math.max(1, ...numericIds) + 1;
  };

  useEffect(() => {
    let active = true;
    setIsLoadingDiagrams(true);
    listDiagrams()
      .then(async (diagrams) => {
        if (!active) return;
        setSavedDiagrams(diagrams);
        if (diagrams[0]) {
          const latest = await getDiagram(diagrams[0].id);
          if (active) applyDiagram(latest);
        }
      })
      .catch(() => {
        if (active) setSaveError('Saved diagrams could not be loaded.');
      })
      .finally(() => {
        if (active) setIsLoadingDiagrams(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const startNewDiagram = () => {
    setDiagramId(null);
    setDiagramName('Untitled mesh');
    setNodes([initialNode]);
    setRelations({});
    setSelectedId(initialNode.id);
    setSelectedEdgeId(null);
    setPan({ x: 0, y: 0 });
    panRef.current = { x: 0, y: 0 };
    idCounter.current = 1;
    setIsSavePanelOpen(false);
    setSaveStatus(null);
    setSaveError(null);
  };

  const saveCurrentDiagram = async () => {
    const name = diagramName.trim() || 'Untitled mesh';
    setIsSaving(true);
    setSaveError(null);
    setSaveStatus(null);
    try {
      const payload = { name, nodes, relations };
      const saved = diagramId
        ? await updateDiagram(diagramId, payload)
        : await createDiagram(payload);
      applyDiagram(saved);
      setSavedDiagrams((current) => [
        saved,
        ...current.filter((diagram) => diagram.id !== saved.id),
      ]);
      setIsSavePanelOpen(false);
      setSaveStatus('Saved just now');
    } catch {
      setSaveError('Could not save this diagram. Try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const openSavedDiagram = async (id: string) => {
    setIsOpeningDiagram(true);
    setSaveError(null);
    setSaveStatus(null);
    try {
      const diagram = await getDiagram(id);
      applyDiagram(diagram);
    } catch {
      setSaveError('Could not open that diagram. Try again.');
    } finally {
      setIsOpeningDiagram(false);
    }
  };

  const removeSavedDiagram = async (id: string) => {
    try {
      await deleteDiagram(id);
      setSavedDiagrams((current) => current.filter((diagram) => diagram.id !== id));
      if (diagramId === id) startNewDiagram();
    } catch {
      setSaveError('Could not delete that diagram. Try again.');
    }
  };

  const addNode = () => {
    const trimmedName = newName.trim();
    if (!trimmedName) return;
    const point = placementPoints[(nodes.length - 1) % placementPoints.length];
    const node: MeshNode = {
      id: `node-${idCounter.current}`,
      name: trimmedName,
      imageUrl: null,
      x: point[0],
      y: point[1],
    };
    idCounter.current += 1;
    setNodes((current) => [...current, node]);
    setSelectedId(node.id);
    setNewName('');
    setIsAdding(false);
  };

  const renameNode = (name: string) => {
    if (!selectedNode) return;
    setNodes((current) =>
      current.map((node) => (node.id === selectedNode.id ? { ...node, name } : node)),
    );
  };

  const deleteSelectedNode = () => {
    if (!selectedNode || nodes.length === 1) return;
    const remaining = nodes.filter((node) => node.id !== selectedNode.id);
    setNodes(remaining);
    setSelectedId(remaining[0].id);
    setSelectedEdgeId(null);
  };

  const moveNode = (clientX: number, clientY: number, nodeId: string) => {
    const bounds = canvasRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const x = Math.max(7, Math.min(93, ((clientX - bounds.left - panRef.current.x) / bounds.width) * 100));
    const y = Math.max(10, Math.min(90, ((clientY - bounds.top - panRef.current.y) / bounds.height) * 100));
    setNodes((current) =>
      current.map((node) => (node.id === nodeId ? { ...node, x, y } : node)),
    );
  };

  const scheduleNodeMove = (event: PointerEvent<HTMLButtonElement>, nodeId: string) => {
    latestNodePointRef.current = { nodeId, clientX: event.clientX, clientY: event.clientY };
    if (nodeMoveFrameRef.current !== null) return;
    nodeMoveFrameRef.current = requestAnimationFrame(() => {
      nodeMoveFrameRef.current = null;
      const point = latestNodePointRef.current;
      if (point) moveNode(point.clientX, point.clientY, point.nodeId);
    });
  };

  const finishNodeMove = (event: PointerEvent<HTMLButtonElement>, nodeId: string) => {
    if (nodeMoveFrameRef.current !== null) {
      cancelAnimationFrame(nodeMoveFrameRef.current);
      nodeMoveFrameRef.current = null;
    }
    moveNode(event.clientX, event.clientY, nodeId);
    latestNodePointRef.current = null;
    setDraggingId(null);
  };

  const startPan = (event: PointerEvent<HTMLDivElement>) => {
    if (event.target instanceof Element && event.target.closest('button, line')) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    panStartRef.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      x: panRef.current.x,
      y: panRef.current.y,
    };
    setIsPanning(true);
  };

  const schedulePan = (event: PointerEvent<HTMLDivElement>) => {
    if (!panStartRef.current || !isPanning) return;
    latestPanPointRef.current = { clientX: event.clientX, clientY: event.clientY };
    if (panFrameRef.current !== null) return;
    panFrameRef.current = requestAnimationFrame(() => {
      panFrameRef.current = null;
      const start = panStartRef.current;
      const point = latestPanPointRef.current;
      if (!start || !point) return;
      const nextPan = {
        x: start.x + point.clientX - start.clientX,
        y: start.y + point.clientY - start.clientY,
      };
      panRef.current = nextPan;
      setPan(nextPan);
    });
  };

  const finishPan = (event: PointerEvent<HTMLDivElement>) => {
    if (panFrameRef.current !== null) {
      cancelAnimationFrame(panFrameRef.current);
      panFrameRef.current = null;
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    panStartRef.current = null;
    latestPanPointRef.current = null;
    setIsPanning(false);
  };

  const cycleRelation = (id: string) => {
    const current = relations[id] ?? 'neutral';
    const next = relationOrder[(relationOrder.indexOf(current) + 1) % relationOrder.length];
    setRelations((existing) => ({ ...existing, [id]: next }));
    setSelectedEdgeId(id);
  };

  const resetRelations = () => {
    setRelations({});
    setSelectedEdgeId(null);
  };

  return (
    <main className="mesh-noise min-h-[100dvh] overflow-hidden bg-[#f3f0e8] text-[#1d3934]">
      <div className="flex min-h-[100dvh] flex-col md:flex-row">
        <aside className="relative z-20 flex w-full shrink-0 flex-col bg-[#183b37] text-[#f5f0e5] md:w-[286px]">
          <div className="flex items-center justify-between border-b border-[#6b9588]/25 px-5 py-5 md:block md:px-7 md:py-7">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f3a17f] text-[#183b37] shadow-[0_6px_16px_rgba(243,161,127,.2)]">
                <GitBranch size={19} strokeWidth={2.4} />
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#9dc5b9]">Workspace</p>
                <h1 className="font-serif text-[25px] leading-none tracking-[-0.03em]">Mesh Relations</h1>
              </div>
            </div>
            <div className="mt-10 hidden md:block">
              <p className="max-w-[190px] text-[13px] leading-[1.65] text-[#b6cec5]">
                A quiet place to make the shape of a network visible.
              </p>
            </div>
          </div>

          <div className="flex flex-1 flex-col px-5 py-5 md:px-7 md:py-7">
            <div className="mb-6 grid grid-cols-3 gap-2 md:mb-9">
              <Stat value={nodes.length} label="Nodes" />
              <Stat value={positiveCount} label="Positive" accent="positive" />
              <Stat value={negativeCount} label="Negative" accent="negative" />
            </div>

            <div className="mb-5 flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#91b6aa]">Nodes in mesh</p>
              <span className="font-mono text-[11px] text-[#6f998d]">{String(nodes.length).padStart(2, '0')}</span>
            </div>
            <div className="scrollbar-none flex max-h-[180px] gap-2 overflow-x-auto pb-2 md:block md:max-h-none md:space-y-2 md:overflow-visible">
              {nodes.map((node, index) => (
                <button
                  key={node.id}
                  type="button"
                  data-testid={`button-select-node-${node.id}`}
                  onClick={() => setSelectedId(node.id)}
                  className={`group flex min-w-[142px] items-center gap-3 rounded-xl border px-3 py-2 text-left transition-all duration-200 md:w-full ${
                    selectedId === node.id
                      ? 'border-[#8ec8b6]/45 bg-[#28534d] text-[#fff8ea]'
                      : 'border-transparent text-[#b6cec5] hover:border-[#6b9588]/30 hover:bg-[#204640]'
                  }`}
                >
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-[10px] ${
                    selectedId === node.id ? 'bg-[#8ec8b6] text-[#183b37]' : 'bg-[#28534d] text-[#9dc5b9]'
                  }`}>
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[12px] font-semibold">{node.name || 'Unnamed'}</span>
                  {selectedId === node.id && <ChevronDown size={14} className="rotate-[-90deg] text-[#8ec8b6]" />}
                </button>
              ))}
            </div>

             <div className="mt-7 border-t border-[#6b9588]/25 pt-5">
               <div className="mb-3 flex items-center justify-between">
                 <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#91b6aa]">Saved diagrams</p>
                 <button
                   type="button"
                   onClick={startNewDiagram}
                   className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-bold text-[#9dc5b9] transition hover:bg-[#204640] hover:text-[#f5f0e5]"
                 >
                   <FilePlus2 size={12} /> New
                 </button>
               </div>
               {isLoadingDiagrams ? (
                 <p className="text-[11px] text-[#82a89d]">Loading diagrams…</p>
               ) : savedDiagrams.length === 0 ? (
                 <p className="text-[11px] leading-[1.5] text-[#82a89d]">Save a mesh to see it here.</p>
               ) : (
                 <div className="max-h-[150px] space-y-1 overflow-y-auto pr-1">
                   {savedDiagrams.map((diagram) => (
                     <div
                       key={diagram.id}
                       className={`group flex items-center gap-2 rounded-lg border px-2.5 py-2 ${
                         diagram.id === diagramId
                           ? 'border-[#8ec8b6]/35 bg-[#28534d]'
                           : 'border-transparent hover:border-[#6b9588]/25 hover:bg-[#204640]'
                       }`}
                     >
                       <button
                         type="button"
                         onClick={() => void openSavedDiagram(diagram.id)}
                         disabled={isOpeningDiagram}
                         className="min-w-0 flex-1 truncate text-left text-[11px] font-semibold text-[#c2d8cf] disabled:opacity-60"
                       >
                         {diagram.name}
                       </button>
                       <button
                         type="button"
                         onClick={(event) => {
                           event.stopPropagation();
                           void removeSavedDiagram(diagram.id);
                         }}
                         className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[#71968b] opacity-0 transition hover:bg-[#315e53] hover:text-[#f5f0e5] group-hover:opacity-100"
                         aria-label={`Delete ${diagram.name}`}
                       >
                         <Trash2 size={11} />
                       </button>
                     </div>
                   ))}
                 </div>
               )}
             </div>

            <div className="mt-auto hidden border-t border-[#6b9588]/25 pt-6 md:block">
              <div className="mb-4 flex items-center gap-2 text-[#a8c5bb]">
                <CircleHelp size={14} />
                <span className="text-[11px] font-semibold">Reading the mesh</span>
              </div>
              <p className="text-[11px] leading-[1.65] text-[#82a89d]">
                Connections begin neutral. Click a line to mark the relationship between two nodes.
              </p>
              <div className="mt-5 flex items-center gap-3 font-mono text-[9px] uppercase tracking-[0.12em] text-[#82a89d]">
                <span className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full bg-[#7faaa0]" /> Neutral</span>
                <span className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full bg-[#ee8273]" /> Negative</span>
                <span className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full bg-[#8ec8b6]" /> Positive</span>
              </div>
            </div>
          </div>
        </aside>

        <section className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="panel-rise flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-[#dcd6c8] bg-[#f3f0e8]/90 px-5 py-4 backdrop-blur-sm md:px-10 md:py-5">
            <div>
               <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#74958a]">{diagramName} / 01</p>
               <p className="mt-1 text-[12px] text-[#688278]">{saveStatus ?? (diagramId ? 'Your latest changes are ready to save.' : 'Make space for the nodes that shape your network.')}</p>
            </div>
             <div className="flex items-center gap-2">
              <button
                type="button"
                data-testid="button-reset-relations"
                onClick={resetRelations}
                className="flex h-9 items-center gap-2 rounded-lg border border-[#d6d0c2] bg-[#f7f4ed] px-3 text-[11px] font-semibold text-[#58746c] transition hover:border-[#aec2b9] hover:bg-[#fffaf0] active:scale-[.98]"
              >
                <RotateCcw size={13} />
                Reset lines
              </button>
              <button
                type="button"
                data-testid="button-open-add-node"
                onClick={() => setIsAdding((current) => !current)}
                className="flex h-9 items-center gap-2 rounded-lg bg-[#2d7164] px-3.5 text-[11px] font-bold text-[#f8f4e9] shadow-[0_5px_12px_rgba(45,113,100,.18)] transition hover:bg-[#245e54] active:scale-[.98]"
              >
                {isAdding ? <X size={14} /> : <Plus size={14} />}
                {isAdding ? 'Close' : 'Add node'}
              </button>
               <button
                 type="button"
                 onClick={() => {
                   if (diagramId) {
                     void saveCurrentDiagram();
                   } else {
                     setIsSavePanelOpen((current) => !current);
                     setIsAdding(false);
                   }
                 }}
                 disabled={isSaving}
                 className="flex h-9 items-center gap-2 rounded-lg border border-[#d6d0c2] bg-[#f7f4ed] px-3 text-[11px] font-bold text-[#315e53] transition hover:border-[#aec2b9] hover:bg-[#fffaf0] active:scale-[.98] disabled:cursor-wait disabled:opacity-60"
               >
                 <Save size={13} />
                 {isSaving ? 'Saving…' : diagramId ? 'Save changes' : 'Save diagram'}
               </button>
               <AccountControl />
            </div>
          </header>

           {isSavePanelOpen && (
             <div className="panel-rise absolute right-5 top-[74px] z-30 w-[min(320px,calc(100%-40px))] rounded-2xl border border-[#d6d0c2] bg-[#fbf8f0] p-4 shadow-[0_16px_35px_rgba(48,71,64,.14)] md:right-10">
               <div className="mb-3 flex items-start justify-between">
                 <div>
                   <p className="font-serif text-[19px] text-[#244941]">Save this diagram</p>
                   <p className="mt-0.5 text-[11px] text-[#789188]">Give your mesh a name to find it later.</p>
                 </div>
                 <button
                   type="button"
                   onClick={() => setIsSavePanelOpen(false)}
                   className="rounded-md p-1 text-[#789188] hover:bg-[#edf0e8] hover:text-[#315e53]"
                   aria-label="Close save panel"
                 >
                   <X size={14} />
                 </button>
               </div>
               <input
                 autoFocus
                 value={diagramName}
                 onChange={(event) => setDiagramName(event.target.value)}
                 onKeyDown={(event) => {
                   if (event.key === 'Enter') void saveCurrentDiagram();
                 }}
                 maxLength={120}
                 placeholder="e.g. Product ecosystem"
                 className="h-10 w-full rounded-lg border border-[#d4d5c9] bg-[#f5f2ea] px-3 text-[12px] text-[#244941] outline-none transition placeholder:text-[#9daea5] focus:border-[#6aa08f] focus:ring-2 focus:ring-[#8ec8b6]/25"
               />
               <button
                 type="button"
                 onClick={() => void saveCurrentDiagram()}
                 disabled={!diagramName.trim() || isSaving}
                 className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-[#f0a080] text-[11px] font-bold text-[#25473f] transition hover:bg-[#f3b091] disabled:cursor-not-allowed disabled:opacity-45"
               >
                 <Save size={13} /> {isSaving ? 'Saving…' : 'Save to account'}
               </button>
               {saveError && <p className="mt-2 text-[11px] text-[#bd5f55]">{saveError}</p>}
             </div>
           )}

          {isAdding && (
            <div className="panel-rise absolute right-5 top-[74px] z-30 w-[min(300px,calc(100%-40px))] rounded-2xl border border-[#d6d0c2] bg-[#fbf8f0] p-4 shadow-[0_16px_35px_rgba(48,71,64,.14)] md:right-10">
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <p className="font-serif text-[19px] text-[#244941]">Add a node</p>
                  <p className="mt-0.5 text-[11px] text-[#789188]">Give this node a name to start.</p>
                </div>
                <span className="rounded-md bg-[#e8f0e8] px-2 py-1 font-mono text-[9px] uppercase tracking-[.12em] text-[#46796d]">New</span>
              </div>
              <input
                autoFocus
                value={newName}
                data-testid="input-new-node-name"
                onChange={(event) => setNewName(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Enter') addNode(); }}
                placeholder="e.g. Hub, Gateway..."
                className="h-10 w-full rounded-lg border border-[#d4d5c9] bg-[#f5f2ea] px-3 text-[12px] text-[#244941] outline-none transition placeholder:text-[#9daea5] focus:border-[#6aa08f] focus:ring-2 focus:ring-[#8ec8b6]/25"
              />
              <button
                type="button"
                data-testid="button-add-node"
                onClick={addNode}
                disabled={!newName.trim()}
                className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-[#f0a080] text-[11px] font-bold text-[#25473f] transition hover:bg-[#f3b091] disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Plus size={14} /> Place on canvas
              </button>
            </div>
          )}

           <div className="relative flex min-h-[520px] flex-1 p-4 md:min-h-0 md:p-7 lg:p-10">
             <div
               ref={canvasRef}
               onPointerDown={startPan}
               onPointerMove={schedulePan}
               onPointerUp={finishPan}
               onPointerCancel={finishPan}
               className={`canvas-fade-in mesh-grid relative min-h-[520px] flex-1 touch-none select-none overflow-hidden rounded-[24px] border border-[#d8d4c9] bg-[#eeeae0] shadow-[inset_0_1px_0_rgba(255,255,255,.65)] md:min-h-0 ${
                 isPanning ? 'cursor-grabbing' : 'cursor-grab'
               }`}
             >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,rgba(255,252,242,.82),transparent_56%)]" />
              <div className="pointer-events-none absolute left-5 top-5 z-10 flex items-center gap-2 rounded-md border border-[#d7d3c8] bg-[#f4f0e7]/80 px-2.5 py-1.5 backdrop-blur-sm md:left-6 md:top-6">
                <MousePointer2 size={12} className="text-[#63897e]" />
                 <span className="font-mono text-[9px] uppercase tracking-[.1em] text-[#708d83]">Drag nodes · pan canvas · click lines</span>
              </div>
              <div className="pointer-events-none absolute bottom-5 left-5 z-10 flex items-center gap-3 text-[10px] text-[#789188] md:bottom-6 md:left-6">
                <span className="font-mono tracking-[.08em]">SIGNALS</span>
                <span className="h-px w-8 bg-[#c3beb1]" />
                <span>{edges.length} {edges.length === 1 ? 'connection' : 'connections'}</span>
              </div>

               <div
                 className="absolute inset-0 will-change-transform"
                 style={{ transform: `translate3d(${pan.x}px, ${pan.y}px, 0)` }}
               >
                 <svg
                   aria-label="Relationship connections"
                   className="pointer-events-auto absolute inset-0 h-full w-full"
                   viewBox="0 0 100 100"
                   preserveAspectRatio="none"
                 >
                   {edges.map((edge) => (
                     <g key={edge.id}>
                       <line
                         x1={edge.source.x}
                         y1={edge.source.y}
                         x2={edge.target.x}
                         y2={edge.target.y}
                         stroke="transparent"
                         strokeWidth="4"
                         className="cursor-pointer"
                         onClick={() => cycleRelation(edge.id)}
                         onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') cycleRelation(edge.id); }}
                         tabIndex={0}
                         role="button"
                         aria-label={`${edge.source.name} to ${edge.target.name}, ${relationLabel(edge.relation)}. Click to cycle.`}
                         data-testid={`connection-${edge.id}`}
                       />
                       <line
                         x1={edge.source.x}
                         y1={edge.source.y}
                         x2={edge.target.x}
                         y2={edge.target.y}
                         stroke={relationTone(edge.relation)}
                         strokeWidth={selectedEdgeId === edge.id ? 0.9 : 0.55}
                         strokeDasharray={edge.relation === 'neutral' ? '1.5 1.4' : undefined}
                         strokeLinecap="round"
                         className="pointer-events-none transition-all duration-300"
                       />
                     </g>
                   ))}
                 </svg>

                 {nodes.map((node) => (
                   <div
                     key={node.id}
                     data-testid={`canvas-node-${node.id}`}
                     className="node-pop node-anchor absolute z-10"
                     style={{ left: `${node.x}%`, top: `${node.y}%` }}
                   >
                     <button
                       type="button"
                       aria-label={`Select and drag ${node.name || 'unnamed node'}`}
                       onClick={() => setSelectedId(node.id)}
                       onPointerDown={(event) => {
                         event.currentTarget.setPointerCapture(event.pointerId);
                         setDraggingId(node.id);
                       }}
                       onPointerMove={(event) => {
                         if (draggingId === node.id) scheduleNodeMove(event, node.id);
                       }}
                       onPointerUp={(event) => {
                         if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                           event.currentTarget.releasePointerCapture(event.pointerId);
                         }
                         finishNodeMove(event, node.id);
                       }}
                       onPointerCancel={(event) => finishNodeMove(event, node.id)}
                       className={`flex h-[52px] w-[52px] touch-none items-center justify-center rounded-full border-[3px] text-[13px] font-bold shadow-[0_8px_15px_rgba(35,69,61,.13)] transition-all duration-200 outline-none md:h-[62px] md:w-[62px] ${
                         draggingId === node.id ? 'cursor-grabbing' : 'cursor-grab'
                       } ${
                         selectedId === node.id
                           ? 'border-[#f1a17f] bg-[#2f7668] text-[#fff8ea]'
                           : 'border-[#d8b39f] bg-[#f8f3e8] text-[#286255] hover:scale-105 hover:border-[#2f7668]'
                       }`}
                     >
                       {node.name.slice(0, 1).toUpperCase() || '?'}
                     </button>
                     <span className={`pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 truncate rounded-md px-2 py-1 text-[11px] font-bold shadow-sm transition-colors ${
                       selectedId === node.id ? 'bg-[#264f47] text-[#fff8ea]' : 'bg-[#f7f2e7]/90 text-[#355e54]'
                     }`}>
                       {node.name || 'Unnamed'}
                     </span>
                   </div>
                 ))}
               </div>
            </div>

            <aside className="panel-rise absolute bottom-7 right-7 z-20 w-[min(270px,calc(100%-56px))] p-1 md:bottom-10 md:right-10">
              {selectedEdge ? (
                <div data-testid={`status-relation-${selectedEdge.id}`}>
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <p className="font-mono text-[9px] uppercase tracking-[.16em] text-[#7b958c]">Active connection</p>
                      <p className="mt-1 font-serif text-[20px] leading-tight text-[#244941]">{selectedEdge.source.name} <span className="text-[#9eb1a8]">↔</span> {selectedEdge.target.name}</p>
                    </div>
                    <button type="button" data-testid="button-clear-edge-selection" aria-label="Close connection details" onClick={() => setSelectedEdgeId(null)} className="rounded-md p-1 text-[#88a098] transition hover:bg-[#edf0e8] hover:text-[#315e53]"><X size={14} /></button>
                  </div>
                  <button
                    type="button"
                    data-testid={`button-cycle-relation-${selectedEdge.id}`}
                    onClick={() => cycleRelation(selectedEdge.id)}
                    className="flex h-9 w-full items-center justify-between rounded-lg border border-[#d9d5ca] bg-[#f4f0e7] px-3 text-[11px] font-bold text-[#315e53] transition hover:border-[#9ebbb0] hover:bg-[#f9f6ee]"
                  >
                    <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: relationTone(selectedEdge.relation) }} />{relationLabel(selectedEdge.relation)} signal</span>
                    <ChevronDown size={14} />
                  </button>
                  <p className="mt-2 text-[10px] leading-[1.45] text-[#82978e]">Click the line or signal above to cycle state.</p>
                </div>
              ) : selectedNode ? (
                <div data-testid={`panel-node-details-${selectedNode.id}`}>
                  <div className="mb-4 flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#dcece4] font-bold text-[#2d7164]">{selectedNode.name.slice(0, 1).toUpperCase() || '?'}</span>
                    <div className="min-w-0">
                      <p className="font-mono text-[9px] uppercase tracking-[.16em] text-[#7b958c]">Selected node</p>
                      <p className="truncate font-serif text-[20px] leading-tight text-[#244941]">{selectedNode.name || 'Unnamed'}</p>
                    </div>
                  </div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[.1em] text-[#789188]" htmlFor="rename-node">Name</label>
                  <div className="flex gap-2">
                    <input
                      id="rename-node"
                      value={selectedNode.name}
                      data-testid={`input-rename-node-${selectedNode.id}`}
                      onChange={(event) => renameNode(event.target.value)}
                      className="h-9 min-w-0 flex-1 rounded-lg border border-[#d4d5c9] bg-[#f5f2ea] px-2.5 text-[11px] text-[#244941] outline-none transition focus:border-[#6aa08f] focus:ring-2 focus:ring-[#8ec8b6]/25"
                    />
                    <button type="button" data-testid={`button-rename-node-${selectedNode.id}`} aria-label="Rename selected node" onClick={() => document.getElementById('rename-node')?.focus()} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#d4d5c9] text-[#5e8177] transition hover:border-[#8db1a3] hover:bg-[#edf2ea]"><Pencil size={13} /></button>
                  </div>
                  <button
                    type="button"
                    data-testid={`button-delete-node-${selectedNode.id}`}
                    onClick={deleteSelectedNode}
                    disabled={nodes.length === 1}
                    className="mt-3 flex items-center gap-2 text-[10px] font-bold text-[#b8695e] transition hover:text-[#d05e51] disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    <Trash2 size={13} />
                    {nodes.length === 1 ? 'Keep at least one node' : 'Remove this node'}
                  </button>
                </div>
              ) : null}
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}

function Stat({ value, label, accent }: { value: number; label: string; accent?: 'positive' | 'negative' }) {
  return (
    <div data-testid={`stat-${label.toLowerCase()}`} className="rounded-xl border border-[#6b9588]/25 bg-[#204640] px-2 py-2.5">
      <p className={`font-mono text-[18px] leading-none ${accent === 'positive' ? 'text-[#9dd2bf]' : accent === 'negative' ? 'text-[#f3a28e]' : 'text-[#f6f0e4]'}`}>{value}</p>
      <p className="mt-1.5 truncate text-[9px] uppercase tracking-[.08em] text-[#86ada1]">{label}</p>
    </div>
  );
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={HomeRedirect} />
        <Route path="/workspace" component={WorkspacePage} />
        <Route path="/sign-in/*?" component={SignInPage} />
        <Route path="/sign-up/*?" component={SignUpPage} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  const stripBase = (path: string) => {
    if (basePath && path.startsWith(basePath)) {
      return path.slice(basePath.length) || '/';
    }
    return path;
  };

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: 'Welcome back',
            subtitle: 'Sign in to return to your mesh',
          },
        },
        signUp: {
          start: {
            title: 'Create your account',
            subtitle: 'Start mapping your mesh',
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ClerkQueryClientCacheInvalidator />
          <Router />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

export default App;