import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react'; // CHANGED
import {
  View,
  Text,
  Pressable,
  FlatList,
  Keyboard,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native'; // CHANGED
import { informacionEmpleado } from '~/lib/services/timeclockStorage';
import { EmployeeApi } from '~/lib/services/branchService';
import { useWindowDimensions } from 'react-native';

interface UserEmployee {
  id: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  email?: string; // ⬅️ no null
  role?: string; // ⬅️ no null
  phone?: string;
  branchId?: string;
  branchName?: string;
  active?: boolean;
}

type CardEmployee = UserEmployee & {};

interface EmployeeSelectProps {
  selectedEmployee: UserEmployee | null;
  onSelectedEmployee: (employee: UserEmployee) => void;
  availableEmployees: EmployeeApi[];
  placeholder?: string;
  isOpen?: boolean;
  onToggle?: (isOpen: boolean) => void;
  disabled?: boolean;
}

export default function EmployeeSelect({
  selectedEmployee,
  onSelectedEmployee,
  availableEmployees,
  placeholder = 'Select Employee',
  isOpen: controlledIsOpen,
  onToggle,
  disabled = false,
}: EmployeeSelectProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const { width } = useWindowDimensions();

  // grid: 2 rows × 3 columns per "page"
  const COLS = 3;
  const ROWS = 2;
  const GAP = 8;
  const PAGE_SIZE = COLS * ROWS;

  // responsive sizing (aim for 3 cols)
  const horizontalPadding = 6;
  const availableW = 150;
  const computed = Math.floor((availableW - GAP * (COLS - 1)) / COLS);
  const cardW = Math.min(160, Math.max(150, computed)); // FIX
  const cardH = 175;
  const pageWidth = COLS * cardW + (COLS - 1) * GAP;
  const pageMargin = 8;
  const snapToInterval = pageWidth + pageMargin * 2;

  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const setOpenState = (s: boolean) => (onToggle ? onToggle(s) : setInternalIsOpen(s));

  // NEW: list ref + page index
  const listRef = useRef<FlatList<CardEmployee[]> | null>(null);
  const [page, setPage] = useState(0);

  // Map API -> card data
  const employeesForCards: CardEmployee[] = useMemo(
    () =>
      (availableEmployees ?? []).map((emp: any) => {
        const name = emp?.name ?? '';
        const first = (name.split(' ')[0] || name).trim();
        const last = name.split(' ').slice(1).join(' ').trim();

        const id = String(emp?.id ?? '');
        const roleLike = emp?.position ?? emp?.role ?? undefined;

        return {
          id,
          firstName: first,
          lastName: last,
          employeeId: id,
          email: emp?.email ?? undefined,
          role: roleLike ?? undefined,
          phone: emp?.phone ?? emp?.mobile ?? undefined,
          branchId: emp?.branchId ?? emp?.sucursalId ?? undefined,
          branchName: emp?.branchName ?? emp?.branch ?? emp?.sucursalName ?? undefined,
          active:
            typeof emp?.active === 'boolean'
              ? emp.active
              : typeof emp?.isActive === 'boolean'
                ? emp.isActive
                : undefined,
        };
      }),
    [availableEmployees]
  );

  // Chunk into pages of 6 (2 rows × 3 cols)
  const pages: CardEmployee[][] = useMemo(() => {
    const out: CardEmployee[][] = [];
    for (let i = 0; i < employeesForCards.length; i += PAGE_SIZE) {
      out.push(employeesForCards.slice(i, i + PAGE_SIZE));
    }
    return out;
  }, [employeesForCards]);

  // NEW: keep page index in range when pages change
  useEffect(() => {
    setPage((p) => Math.min(p, Math.max(0, pages.length - 1)));
  }, [pages.length]);

  // NEW: derived arrows
  const pageCount = pages.length;
  const canGoLeft = page > 0 && pageCount > 1;
  const canGoRight = page < pageCount - 1;

  // NEW: paging helpers
  const scrollToPage = (next: number) => {
    const clamped = Math.max(0, Math.min(next, pageCount - 1));
    listRef.current?.scrollToOffset({ offset: clamped * snapToInterval, animated: true });
    setPage(clamped);
  };
  const goLeft = () => scrollToPage(page - 1);
  const goRight = () => scrollToPage(page + 1);

  // NEW: sync page from snap end
  const onMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const p = Math.round(x / snapToInterval);
    if (p !== page) setPage(p);
  };

  const handleSelectEmployee = (employee: CardEmployee) => {
    const payloadForParent: UserEmployee = {
      id: employee.id,
      firstName: employee.firstName,
      lastName: employee.lastName,
      employeeId: employee.employeeId,
      email: employee.email ?? undefined,
      role: employee.role ?? undefined,
      phone: employee.phone ?? undefined,
      branchId: employee.branchId ?? undefined,
      branchName: employee.branchName ?? undefined,
      active: typeof employee.active === 'boolean' ? employee.active : undefined,
    };

    const payloadForStorage = {
      id: payloadForParent.id,
      firstName: payloadForParent.firstName,
      lastName: payloadForParent.lastName,
      employeeId: payloadForParent.employeeId,
      email: payloadForParent.email,
      role: payloadForParent.role,
    };

    onSelectedEmployee(payloadForParent);
    informacionEmpleado(payloadForStorage);
    setOpenState(false);
    Keyboard.dismiss();
  };

  const getInitials = (first: string, last: string) =>
    [first?.[0], last?.[0]]
      .filter(Boolean)
      .map((c) => c?.toUpperCase())
      .join('');

  const colorFromId = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 70%, 90%)`;
  };

  const SelectedChip = () => (
    <View className="rounded-full bg-red-600 px-2 py-0.5">
      <Text className="text-[10px] font-semibold text-white">Selected</Text>
    </View>
  );

  const EmployeeCard = useCallback(
    ({ item }: { item: CardEmployee }) => {
      const selected = selectedEmployee?.id === item.id;
      const initials = getInitials(item.firstName, item.lastName);
      const avatarBg = colorFromId(item.id);

      return (
        <Pressable
          accessibilityRole="button"
          onPress={() => handleSelectEmployee(item)}
          disabled={disabled}
          android_ripple={{ color: '#e5e7eb' }}
          className={`relative rounded-2xl border p-4 shadow-sm
          ${selected ? 'border-red-500 bg-red-50' : 'border-zinc-200 bg-white'}
          ${disabled ? 'opacity-60' : ''}
        `}
          style={{ width: cardW, height: cardH, justifyContent: 'space-between' }}
          accessibilityState={{ selected }}>
          {selected && (
            <View className="absolute right-2 top-2" pointerEvents="none">
              <SelectedChip />
            </View>
          )}

          <View className="items-center">
            <View
              className="h-12 w-12 items-center justify-center rounded-full"
              style={{ backgroundColor: avatarBg }}>
              <Text className="text-base font-bold text-zinc-700">{initials || '•'}</Text>
            </View>
          </View>

          <View className="items-center">
            <Text numberOfLines={1} className="text-base font-semibold text-zinc-900">
              {item.firstName} {item.lastName}
            </Text>
            <Text numberOfLines={1} className="text-xs text-zinc-500">
              {item.role ? item.role.toUpperCase() : '—'}
            </Text>
          </View>

          <View>
            {item.email ? (
              <Text numberOfLines={1} className="text-xs text-zinc-500">
                {item.email}
              </Text>
            ) : null}
          </View>
        </Pressable>
      );
    },
    [selectedEmployee, disabled, cardW, cardH]
  );

  return (
    <View className="shadow-inner relative w-full rounded-lg border border-zinc-200 bg-white">
      {/* CHANGED: relative for overlays */}
      {/* NEW: Left/Right arrow overlays */}
      {canGoLeft && !disabled && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Scroll right"
          hitSlop={8}
          android_ripple={{ color: '#00000000', borderless: true }}
          className=" items-center justify-center"
          style={{
            position: 'absolute',
            left: -15,
            top: '50%',
            marginTop: -28,
            height: 48,
            width: 48,
            zIndex: 10,
          }}>
          <Text className="text-6xl text-zinc-300">‹</Text>
        </Pressable>
      )}
      {canGoRight && !disabled && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Scroll right"
          hitSlop={8}
          android_ripple={{ color: '#00000000', borderless: true }}
          className=" items-center justify-center"
          style={{
            position: 'absolute',
            right: -15,
            top: '50%',
            marginTop: -28,
            height: 48,
            width: 48,
            zIndex: 10,
          }}>
          <Text className="text-6xl text-zinc-300">›</Text>
        </Pressable>
      )}
      <FlatList
        ref={listRef} // NEW
        data={pages}
        keyExtractor={(_, idx) => `page-${idx}`}
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToAlignment="start"
        snapToInterval={snapToInterval}
        contentContainerStyle={{ paddingHorizontal: horizontalPadding, paddingVertical: 8 }}
        onMomentumScrollEnd={onMomentumScrollEnd} // NEW
        renderItem={({ item: page }) => {
          const fillers = PAGE_SIZE - page.length;
          return (
            <View
              style={{
                width: pageWidth,
                marginHorizontal: pageMargin,
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: GAP,
              }}>
              {page.map((emp) => (
                <EmployeeCard key={emp.id} item={emp} />
              ))}
              {fillers > 0 &&
                Array.from({ length: fillers }).map((_, i) => (
                  <View key={`filler-${i}`} style={{ width: cardW, height: cardH, opacity: 0 }} />
                ))}
            </View>
          );
        }}
        ListEmptyComponent={
          <View className="w-full items-center justify-center py-10">
            <Text className="text-sm text-zinc-500">{placeholder}</Text>
          </View>
        }
      />
    </View>
  );
}
