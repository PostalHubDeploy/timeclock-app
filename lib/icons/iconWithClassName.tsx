import type { LucideIcon } from 'lucide-react-native';
import { cssInterop } from 'nativewind';

export function iconWithClassName(icon: LucideIcon) {
cssInterop(icon, {
    className: {
    target: 'style',
    nativeStyleToProp: {
        color: true,
        opacity: true,
                stroke: true, // 👈 Esta es clave para text-* en Lucide

    },
    },
});
}