import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Pressable, FlatList } from 'react-native';
import { informacionSucursal, obtenerInformacionSucursal } from '~/lib/services/timeclockStorage';
import { type BranchApi } from '../../lib/services/branchService';

interface Branch {
  id: string;
  name: string;
  // Optional extras (rendered only if the API provides them)
  subtitle?: string;
  meta?: string;
  addressFull?: string;
  city?: string;
  state?: string;
  stats?: {
    workers?: number;
    mailboxes?: number;
    physicalMailboxesCapacity?: number;
  };
}

interface BranchSelectProps {
  selectedBranch: Branch | null;
  onSelectBranch: (branch: Branch) => void;
  availableBranches?: BranchApi[];
  placeholder?: string;
  isOpen?: boolean;
  onToggle?: (isOpen: boolean) => void;
  disabled?: boolean;
}

export default function BranchSelect({
  selectedBranch,
  onSelectBranch,
  availableBranches = [],
  placeholder = 'Select Branch',
  isOpen: controlledIsOpen,
  onToggle,
  disabled = false,
}: BranchSelectProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [lastUsedBranchId, setLastUsedBranchId] = useState<string | null>(null);

  // Controlled vs internal (unchanged)
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const toggleOpen = () => {
    const newState = !isOpen;
    if (onToggle) onToggle(newState);
    else setInternalIsOpen(newState);
  };

  // Normalize API → Branch (tolerates either sucursalId or id; pulls optional fields when present)
  useEffect(() => {
    if (availableBranches.length > 0) {
      const mapped: Branch[] = (availableBranches as any[]).map((b) => ({
        id: b.sucursalId ?? b.id,
        name: b.name ?? 'Unnamed Branch',
        subtitle:
          b.subtitle ??
          ([b.address?.city, b.address?.state].filter(Boolean).join(', ') || undefined),
        meta: b.meta,
        addressFull: b.address?.full,
        city: b.address?.city,
        state: b.address?.state,
        stats: b.stats
          ? {
              workers: b.stats.workers,
              mailboxes: b.stats.mailboxes,
              physicalMailboxesCapacity: b.stats.physicalMailboxesCapacity,
            }
          : undefined,
      }));
      setBranches(mapped);
    } else {
      setBranches([]);
    }
  }, [availableBranches]);

  // Load stored branch after branches are present (unchanged)
  useEffect(() => {
    if (branches.length > 0 && !selectedBranch) {
      loadStoredBranch();
    }
  }, [branches]);

  const loadStoredBranch = async () => {
    try {
      const storedBranch = await obtenerInformacionSucursal();
      if (storedBranch) {
        setLastUsedBranchId(storedBranch.id);
        const fullBranch = getBranchById(storedBranch.id);
        if (fullBranch && onSelectBranch) onSelectBranch(fullBranch);
      }
    } catch (error) {
      console.error('Error loading stored branch:', error);
    }
  };

  const getBranchById = (id: string): Branch | null =>
    branches.find((branch) => branch.id === id) || null;

  const handleSelectBranch = (branch: Branch) => {
    onSelectBranch(branch);
    informacionSucursal(branch);
    if (onToggle) onToggle(false);
    else setInternalIsOpen(false);
  };

  const getInitials = (name: string) =>
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('');

  // Stable pastel color per branch (for the avatar)
  const colorFromId = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 70%, 90%)`;
  };

  const Chip = ({ label, tone = 'default' }: { label: string; tone?: 'default' | 'muted' }) => (
    <View
      className={
        tone === 'muted'
          ? 'rounded-full bg-zinc-100 px-2 py-0.5'
          : 'rounded-full bg-red-600 px-2 py-0.5'
      }>
      <Text
        className={
          tone === 'muted'
            ? 'text-[10px] font-semibold text-zinc-700'
            : 'text-[10px] font-semibold text-white'
        }>
        {label}
      </Text>
    </View>
  );

  const CARD_WIDTH = 256; // w-64

  const CARD_GAP = 8; // space between the two cards in a row
  const ROW_MARGIN = 8; // margin between rows (pages)
  const PAGE_WIDTH = CARD_WIDTH * 2 + CARD_GAP; // exact width of each horizontally-snapped item
  const SNAP_INTERVAL = PAGE_WIDTH + ROW_MARGIN * 2;

  const BranchCard = ({ item }: { item: Branch }) => {
    const selected = selectedBranch?.id === item.id;
    const initials = getInitials(item.name);
    const avatarBg = colorFromId(item.id);

    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => handleSelectBranch(item)}
        disabled={disabled}
        android_ripple={{ color: '#e5e7eb' }}
        className={` w-64 gap-2 rounded-2xl border p-4 shadow-sm
        ${selected ? 'border-red-500 bg-red-50' : 'border-zinc-200 bg-white'}
        ${disabled ? 'opacity-60' : ''}
      `}
        style={{ justifyContent: 'space-between' }}>
        {/* Header row */}
        <View className="flex-row items-center gap-2">
          <View
            className="h-12 w-12 items-center justify-center rounded-full"
            style={{ backgroundColor: avatarBg }}>
            <Text className="text-base font-bold text-zinc-700">{initials}</Text>
          </View>
          <View className="flex-1">
            <Text numberOfLines={1} className="text-base font-semibold text-zinc-900">
              {item.name}
            </Text>
            <Text numberOfLines={1} className="text-xs text-zinc-500">
              {item.subtitle || `ID: ${item.id}`}
            </Text>
          </View>
          {selected && <Chip label="Selected" />}
          {!selected && lastUsedBranchId === item.id && <Chip label="Last used" tone="muted" />}
        </View>

        {/* Middle: address/meta (if present) */}
        {!!(item.addressFull || item.meta) && (
          <View>
            {item.addressFull ? (
              <Text numberOfLines={1} className="text-xs text-zinc-500">
                {item.addressFull}
              </Text>
            ) : null}
          </View>
        )}
      </Pressable>
    );
  };
  const rows = React.useMemo(() => {
    const out: Branch[][] = [];
    for (let i = 0; i < branches.length; i += 2) {
      out.push(branches.slice(i, i + 2)); // [b0,b1], [b2,b3], ...
    }
    return out;
  }, [branches]);

  return (
    <View className="shadow-inner w-full rounded-lg border border-zinc-200 bg-white">
      <FlatList
        data={rows}
        keyExtractor={(_, idx) => `row-${idx}`}
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToAlignment="start"
        snapToInterval={SNAP_INTERVAL} // snap one “pair” at a time
        contentContainerStyle={{ paddingHorizontal: 8, paddingVertical: 8 }}
        renderItem={({ item: pair }) => (
          <View
            style={{
              width: PAGE_WIDTH, // fixed width so snapping is perfect
              marginHorizontal: ROW_MARGIN, // gap between rows/pages
              flexDirection: 'row',
              columnGap: CARD_GAP, // space between the two cards
            }}>
            {/* First card */}
            <BranchCard item={pair[0]} />

            {/* Second card or invisible spacer to keep width consistent */}
            {pair[1] ? (
              <BranchCard item={pair[1]} />
            ) : (
              <View style={{ width: CARD_WIDTH, opacity: 0 }} />
            )}
          </View>
        )}
        ListEmptyComponent={
          <View className="w-full items-center justify-center py-10">
            <Text className="text-sm text-zinc-500">{placeholder}</Text>
          </View>
        }
      />
    </View>
  );
}
