import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, Pressable, FlatList, Keyboard } from 'react-native';
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
  const availableW = Math.max(width - horizontalPadding * 2, 320);
  const cardW = Math.min(150, Math.max(160, Math.floor((availableW - GAP * (COLS - 1)) / COLS)));
  const cardH = 175; // keep height same (no UI change)
  const pageWidth = COLS * cardW + (COLS - 1) * GAP;
  const pageMargin = 8;
  const snapToInterval = pageWidth + pageMargin * 2;

  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const setOpenState = (s: boolean) => (onToggle ? onToggle(s) : setInternalIsOpen(s));

  // Map API -> card data (surface more fields; visuals unchanged)
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
          email: emp?.email ?? undefined, // ⬅️ undefined, not null
          position: roleLike ?? undefined, // ⬅️ undefined, not null
          role: roleLike ?? undefined,
          phone: emp?.phone ?? emp?.mobile ?? undefined, // ⬅️ undefined
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

  const handleSelectEmployee = (employee: CardEmployee) => {
    const payloadForParent: UserEmployee = {
      id: employee.id,
      firstName: employee.firstName,
      lastName: employee.lastName,
      employeeId: employee.employeeId,
      email: employee.email ?? undefined, // ⬅️ ensure undefined
      role: employee.role ?? employee.role ?? undefined,
      phone: employee.phone ?? undefined,
      branchId: employee.branchId ?? undefined,
      branchName: employee.branchName ?? undefined,
      active: typeof employee.active === 'boolean' ? employee.active : undefined,
    };

    // Storage expects its own UserEmployee shape (no nulls). Keep only fields it knows:
    const payloadForStorage = {
      id: payloadForParent.id,
      firstName: payloadForParent.firstName,
      lastName: payloadForParent.lastName,
      employeeId: payloadForParent.employeeId,
      email: payloadForParent.email, // string | undefined
      role: payloadForParent.role, // string | undefined
    };

    onSelectedEmployee(payloadForParent);
    informacionEmpleado(payloadForStorage); // ✅ no nulls now

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
          {/* Selected pill overlay (top-right) */}
          {selected && (
            <View className="absolute right-2 top-2" pointerEvents="none">
              <SelectedChip />
            </View>
          )}

          {/* Top: Initials */}
          <View className="items-center">
            <View
              className="h-12 w-12 items-center justify-center rounded-full"
              style={{ backgroundColor: avatarBg }}>
              <Text className="text-base font-bold text-zinc-700">{initials || '•'}</Text>
            </View>
          </View>

          {/* Middle: Name + Role (unchanged visuals) */}
          <View className="items-center">
            <Text numberOfLines={1} className="text-base font-semibold text-zinc-900">
              {item.firstName} {item.lastName}
            </Text>
            <Text numberOfLines={1} className="text-xs text-zinc-500">
              {item.role ? item.role.toUpperCase() : '—'}
            </Text>
          </View>

          {/* Bottom: Email (unchanged visuals) */}
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
    <View className="shadow-inner w-full rounded-lg border border-zinc-200 bg-white">
      <FlatList
        data={pages}
        keyExtractor={(_, idx) => `page-${idx}`}
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToAlignment="start"
        snapToInterval={snapToInterval}
        contentContainerStyle={{ paddingHorizontal: horizontalPadding, paddingVertical: 8 }}
        renderItem={({ item: page }) => {
          const fillers = PAGE_SIZE - page.length;
          return (
            <View
              style={{
                width: pageWidth,
                marginHorizontal: pageMargin, // keep your spacing
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: GAP,
              }}>
              {page.map((emp) => (
                <EmployeeCard key={emp.id} item={emp} />
              ))}
              {/* keep grid shape on last page */}
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
