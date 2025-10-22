import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, FlatList, Modal } from 'react-native';
import House from '~/assets/images/house.svg';
import { ArrowLeft } from '~/lib/icons/ArrowLeft';
import { UserCircle } from '../../lib/icons/UserCircle';
import { informacionSucursal, obtenerInformacionSucursal } from '~/lib/services/timeclockStorage';
import { type BranchApi } from '../../lib/services/branchService';

interface Branch {
  id: string;
  name: string;
  icon?: React.ReactNode;
}

interface UserEmployee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  position: string;
  employeeId: string;
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
  const [employees, setEmployees] = useState<UserEmployee[]>([]);
  const [loading, setLoading] = useState(false);
  // Usar el estado controlado si se proporciona, sino usar el interno
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  const toggleOpen = () => {
    const newState = !isOpen;
    if (onToggle) {
      onToggle(newState);
    } else {
      setInternalIsOpen(newState);
    }
  };

  // Convertir BranchApi a Branch con iconos
  useEffect(() => {
    if (availableBranches.length > 0) {
      const branchesWithIcons: Branch[] = availableBranches.map((branchApi) => ({
        id: branchApi.sucursalId,
        name: branchApi.name,
        icon: <House width={20} height={20} />,
      }));
      setBranches(branchesWithIcons);
    }
  }, [availableBranches]);

  // Cargar la sucursal guardada después de cargar las sucursales disponibles
  useEffect(() => {
    if (branches.length > 0 && !selectedBranch) {
      loadStoredBranch();
    }
  }, [branches]);

  const loadStoredBranch = async () => {
    try {
      const storedBranch = await obtenerInformacionSucursal();
      if (storedBranch) {
        // Buscar la sucursal completa en la lista usando el ID guardado
        const fullBranch = getBranchById(storedBranch.id);
        if (fullBranch && onSelectBranch) {
          onSelectBranch(fullBranch);
        }
      }
    } catch (error) {
      console.error('Error loading stored branch:', error);
    }
  };

  const fetchBranches = async () => {
    // Esta función ya no es necesaria ya que recibimos las branches como props
    // Se mantiene por compatibilidad pero no hace nada
    return;
  };

  // Función utilitaria para obtener la sucursal completa por ID
  const getBranchById = (id: string): Branch | null => {
    return branches.find((branch) => branch.id === id) || null;
  };

  const handleSelectBranch = (branch: Branch) => {
    onSelectBranch(branch);
    informacionSucursal(branch); // Guardar solo los datos serializables de la sucursal en el almacenamiento local
    if (onToggle) {
      onToggle(false);
    } else {
      setInternalIsOpen(false);
    }
  };

  // const renderBranchItemCard = ({ item }: { item: Branch }) => (
  //   <Pressable
  //     style={{ marginHorizontal: 1, marginBottom: 12 }}
  //     className={`w-1/3 items-center justify-center rounded-xl bg-white p-4 shadow-md active:scale-95 ${
  //       selectedBranch?.id === item.id ? 'bg-blue-300' : ''
  //     }`}
  //     onPress={() => {
  //       handleSelectBranch(item);
  //       // console.log('Selected branch:', item);
  //     }}>
  //     <View className="relative flex w-full flex-col items-center justify-center">
  //       {/* Icon Section */}
  //       <View className="mb-4 mt-4">{item.icon || <House width={80} height={80} />}</View>

  //       {/* Branch Info */}
  //       <View className="mb-4 flex w-full flex-col items-center justify-center gap-2">
  //         <View className="flex flex-col items-center justify-center">
  //           <Text className="text-center text-2xl font-bold">{item.name}</Text>
  //         </View>
  //       </View>

  //       {/* Branch ID at top */}
  //       <View className="absolute top-2 flex flex-col items-center justify-center">
  //         <View className="flex flex-col items-center justify-center">
  //           <Text className="text-center text-xl font-bold">{item.id}</Text>
  //           <Text className="text-center text-sm text-gray-500">Branch ID</Text>
  //         </View>
  //       </View>

  //       {/* Selection indicator */}
  //       {selectedBranch?.id === item.id && (
  //         <View className="absolute right-2 top-2">
  //           <View className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500">
  //             <Text className="text-xs font-bold text-white">✓</Text>
  //           </View>
  //         </View>
  //       )}
  //     </View>
  //   </Pressable>
  // );

  const renderBranchItem = ({ item }: { item: Branch }) => (
    <Pressable
      onPress={() => handleSelectBranch(item)}
      className={`m-2 flex flex-col justify-center items-center  h-40 rounded-2xl border-b border-gray-200 p-4 ${
        selectedBranch?.id === item.id ? 'bg-blue-50' : 'bg-gray-100'
      }`}
      style={{
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1, width: '100%' }}>
        <View className="mb-4 mt-4">{item.icon || <House width={80} height={80} />}</View>
        <Text
          className={`flex-1 text-lg ${
            selectedBranch?.id === item.id ? 'font-semibold text-blue-600' : 'text-gray-700'
          }`}
          style={{ textAlign: 'center' }}
        >
          {item.name}
        </Text>
        {selectedBranch?.id === item.id && (
          <View className="p-1 rounded-full bg-blue-500" style={{ alignSelf: 'center' }}>
            <Text className="text-xs font-bold text-white">SELECTED</Text>
          </View>
        )}
      </View>
    </Pressable>
  );

  return (
    <View className="w-full shadow-inner rounded-lg border border-gray-300 bg-white ">
    <FlatList
      data={branches}
      renderItem={renderBranchItem}
      keyExtractor={(item) => item.id}
      className=""
      
      horizontal={true}
      
    />
    </View>
  );
}
