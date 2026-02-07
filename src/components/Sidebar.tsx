'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
    LayoutDashboard,
    FilePlus,
    BookPlus,
    BookOpen,
    Scale,
    FileBarChart2,
    Landmark,
    ArrowRightLeft,
    Users,
    Library,
    Boxes,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Menu,
    X,
    ShoppingCart,
    Factory,
    LogOut,
    Settings,
    DollarSign,
    Banknote,
    Package,
    Wrench,
    Fuel,
    Undo2,
    Trash2,
    Truck,
    Sparkles,
    ShieldCheck,
    Ban,
    Layers,
    Send,
    TrendingUp,
    TrendingDown,
    Receipt,
    CreditCard,
    BookText,
    Database,
    GitCompare,
    PiggyBank,
    CircleDollarSign,
    Archive,
    BarChart,
    LayoutGrid,
    Bell,
    LineChart,
    FileText,
    ClipboardList,
    History,
    ShieldAlert,
    ArrowDown,
    ArrowUp,
    RefreshCw,
    AreaChart,
    Target,
    Briefcase, 
    Wallet,
    Clock, 
    Award,
    CalendarClock, 
    UserCheck,
    Store,
    FileClock,
    Quote,
    CheckSquare,
    Tags,
    Warehouse,
    UserSquare,
    FolderSync,
    Cog,
    BadgeDollarSign,
    Ruler,
    Link as LinkIcon,
    FileChartPie,
    Home,
    Building,
    UserCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from './ui/scroll-area';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useAuth } from '@/hooks/useAuth';
import { allNavItems } from '@/lib/nav-items';
// --- ADD THESE DND-KIT IMPORTS ---
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    useDraggable,
    useDroppable,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react'; // Also add GripVertical

// --- ADD THESE TYPE DEFINITIONS ---
interface NavItem {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    permission?: string;
}

interface QuickActionItem extends NavItem {
    id: string; // Unique ID for each quick action
}

// --- DRAGGABLE NAV ITEM COMPONENT ---
function DraggableNavItem({ item }: { item: NavItem }) {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: `draggable-${item.href}`,
        data: item, // Pass the item data with the drag event
    });
    
    const style = {
        // This makes the item follow the cursor while dragging
        transform: CSS.Translate.toString(transform),
    };

    const isActive = usePathname() === item.href;

    return (
        <div 
            ref={setNodeRef} 
            style={style}
            className={cn(
                "flex items-center justify-between p-3 rounded-lg group",
                isActive ? "bg-white/20 text-white font-semibold shadow-md" : "text-primary-foreground/80"
            )}
        >
            <Link href={item.href} className="flex-grow flex items-center gap-3">
                <item.icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
            </Link>
            {/* This is the handle you will click and drag */}
            <div 
                {...listeners} 
                {...attributes} 
                className="p-1 cursor-grab opacity-50 group-hover:opacity-100 transition-opacity"
                title={`Drag to add '${item.label}' to Quick Actions`}
            >
                <GripVertical className="h-5 w-5" />
            </div>
        </div>
    );
}
// --- END OF COMPONENT ---

function getFlattenedNavItems(items: any[]): NavItem[] {
    const flatList: NavItem[] = [];
    function recurse(subItems: any[]) {
        for (const item of subItems) {
            if (item.href && item.icon) {
                flatList.push(item);
            }
            if (item.subItems) {
                recurse(item.subItems);
            }
        }
    }
    recurse(items);
    return flatList;
}


export function Sidebar() {
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
    const [isMobile, setIsMobile] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    // --- ADD THIS CODE ---
// State to hold the list of quick action items
const [quickActions, setQuickActions] = useState<QuickActionItem[]>([]);

// Load and re-hydrate actions from local storage on mount
useEffect(() => {
    const savedActions = localStorage.getItem('clearbooks-quick-actions');
    if (savedActions) {
        const parsedActions: Omit<QuickActionItem, 'icon'>[] = JSON.parse(savedActions);
        const flattenedNavItems = getFlattenedNavItems(allNavItems);

        const hydratedActions = parsedActions.map(action => {
            const originalItem = flattenedNavItems.find(item => item.href === action.href);
            return {
                ...action,
                icon: originalItem ? originalItem.icon : Users, // Fallback icon
            };
        }).filter(action => action.icon); // Ensure item is valid

        setQuickActions(hydratedActions as QuickActionItem[]);
    }
}, []);

// Helper to save actions to both state and local storage
// Helper to save actions to both state and local storage
const saveQuickActions = (actions: QuickActionItem[]) => {
    setQuickActions(actions);
    // Create a serializable version for localStorage by removing the icon component
    const serializableActions = actions.map(({ icon, ...rest }) => rest);
    localStorage.setItem('clearbooks-quick-actions', JSON.stringify(serializableActions));
};


// Adds a new item to quick actions if it's not already there
const addQuickAction = (item: NavItem) => {
    // Prevent duplicates and limit to 4 actions
    if (!quickActions.some(action => action.href === item.href) && quickActions.length < 4) {
        const newAction = { ...item, id: `qa-${item.href}` }; // Create a unique ID
        saveQuickActions([...quickActions, newAction]);
    }
};

// Removes an item from quick actions
const removeQuickAction = (href: string) => {
    saveQuickActions(quickActions.filter(action => action.href !== href));
};
// --- END OF CODE TO ADD ---
   
// --- ADD THIS DND-KIT LOGIC ---
// Sets up sensors for pointer (mouse/touch) and keyboard
const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
);

// This function is called when a draggable item is dropped
function handleDragEnd(event: any) {
    // Check if the item was dropped over the quick actions area
    if (event.over && event.over.id === 'quick-actions-drop-zone') {
        const item = event.active.data.current;
        if (item) {
            addQuickAction(item); // Add the dropped item to our actions
        }
    }
}
// --- END DND-KIT LOGIC ---

// --- QUICK ACTIONS DROP ZONE COMPONENT ---
const QuickActionsDropZone = () => {
    const { setNodeRef, isOver } = useDroppable({
        id: 'quick-actions-drop-zone',
    });

    return (
        <div className="p-4 border-t border-white/20">
            <h3 className="text-sm font-semibold text-primary-foreground/80 mb-2 px-1">
                Quick Actions
            </h3>
            <div 
                ref={setNodeRef}
                className={cn(
                    "grid grid-cols-2 gap-2 min-h-[88px] p-2 rounded-lg border-2 border-dashed border-white/20 transition-colors",
                    // Highlight the drop zone when an item is dragged over it
                    isOver ? "bg-white/20 border-white/40" : ""
                )}
            >
                {quickActions.map(action => (
                    <div key={action.id} className="relative group">
                        <Link 
                            href={action.href} 
                            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg flex flex-col items-center justify-center text-center h-full transition-colors aspect-square"
                            title={action.label}
                        >
                            <action.icon className="h-5 w-5 text-primary-foreground mb-1" />
                            <span className="text-xs text-primary-foreground leading-tight">
                                {action.label}
                            </span>
                        </Link>
                        {/* Remove button */}
                        <button
                            onClick={() => removeQuickAction(action.href)}
                            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            title={`Remove '${action.label}'`}
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </div>
                ))}
                {quickActions.length === 0 && (
                     <div className="col-span-2 flex items-center justify-center">
                        <p className="text-xs text-center text-primary-foreground/50 p-4">
                            Drag a tab here for quick navigation.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
// --- END OF COMPONENT ---


    // Check if mobile
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
            if (window.innerWidth >= 768) {
                setMobileOpen(false);
            }
        };
        
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    if (!user || !user.permissions) {
        return (
            <aside className={cn(
                "flex-shrink-0 rounded-2xl bg-gradient-to-b from-primary to-primary/90 border shadow-xl flex flex-col transition-all duration-300 ease-in-out",
                isCollapsed ? "w-16" : "w-64"
            )}>
                <div className="p-4 flex items-center justify-between border-b border-white/20">
                    <div className="flex items-center gap-2">
                        <Library className={cn(
                            "text-primary-foreground transition-all",
                            isCollapsed ? "h-6 w-6" : "h-8 w-8"
                        )} />
                        {!isCollapsed && (
                            <h2 className="text-2xl font-bold text-primary-foreground">ClearBooks</h2>
                        )}
                    </div>
                </div>
            </aside>
        );
    }

    const isAdmin = user.role === 'admin';

    const filterItems = (items: any[]) => {
        return items
            .map(item => {
                if (item.companyType && item.companyType !== user.company_type) {
                    return null;
                }
                if (isAdmin) {
                    return item;
                }
                if (item.subItems) {
                    const accessibleSubItems = filterItems(item.subItems);
                    return accessibleSubItems.length > 0 ? { ...item, subItems: accessibleSubItems } : null;
                }
                if (item.permission) {
                    return user.permissions?.includes(item.permission) ? item : null;
                }
                return item; // For titles
            })
            .filter((item): item is NonNullable<typeof item> => item !== null);
    };
    
    const navItems = filterItems(allNavItems);

    const toggleSection = (label: string) => {
        setOpenSections(prev => ({
            ...prev,
            [label]: !prev[label]
        }));
    };

    const getSectionIcon = (sectionLabel: string) => {
        // Map section labels to icons for collapsed state
        const iconMap: Record<string, any> = {
            'Financial Management': Landmark,
            'Business Operations': Building,
            'Inventory Management': Package,
            'Sales': Store,
            'Purchases': ShoppingCart,
            'Production': Factory,
            'Reports': FileBarChart2,
            'Accounting': BookOpen,
            'Budgets': PiggyBank
        };
        return iconMap[sectionLabel] || Boxes;
    };

    const renderNavItems = (items: any[], level = 0, parentLabel = '') => {
        return items.map((item, index) => {
            const itemKey = `${parentLabel}-${item.label}-${index}`;
            
            if (item.isTitle) {
                if (isCollapsed) {
                    // Show icon-only tooltip for titles in collapsed mode
                    const SectionIcon = getSectionIcon(item.label);
                    return (
                        <li key={itemKey} className="relative group">
                            <div className="px-3 pt-4 pb-2">
                                <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10">
                                    <SectionIcon className="h-5 w-5 text-primary-foreground/70" />
                                </div>
                            </div>
                            {/* Tooltip */}
                            <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                                {item.label}
                            </div>
                        </li>
                    );
                }
                return (
                    <li key={itemKey} className="px-3 pt-4 pb-2">
                        <div className="text-xs font-bold text-primary-foreground/60 uppercase tracking-wider">
                            {item.label}
                        </div>
                        {item.description && (
                            <div className="text-xs text-primary-foreground/40 mt-1">
                                {item.description}
                            </div>
                        )}
                    </li>
                );
            }

            if (item.subItems) {
                const isOpen = openSections[item.label];
                
                if (isCollapsed) {
                    // Collapsed view for submenus
                    return (
                        <li key={itemKey} className="relative group">
                            <button
                                onClick={() => toggleSection(item.label)}
                                className="flex items-center justify-center w-full p-3 rounded-lg cursor-pointer transition-all duration-200 text-primary-foreground/80 hover:bg-white/20 hover:text-white"
                            >
                                <div className="flex flex-col items-center gap-1">
                                    <item.icon className="h-5 w-5" />
                                    <ChevronDown className={cn(
                                        "h-3 w-3 transition-transform",
                                        isOpen && "rotate-180"
                                    )} />
                                </div>
                            </button>
                            {/* Tooltip */}
                            <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                                {item.label}
                            </div>
                            {/* Dropdown for collapsed submenu */}
                            {isOpen && (
                                <div className="absolute left-full ml-1 top-0 bg-primary border border-white/10 rounded-lg shadow-xl z-40 py-2 min-w-[180px]">
                                    <ul className="space-y-1">
                                        {item.subItems.map((subItem: any, subIndex: number) => {
                                            if (subItem.subItems) {
                                                // Nested submenu in dropdown
                                                return (
                                                    <div key={subIndex} className="px-3 py-1">
                                                        <div className="text-xs text-primary-foreground/60 font-semibold mb-1">
                                                            {subItem.label}
                                                        </div>
                                                        {subItem.subItems.map((nestedItem: any) => (
                                                            <li key={nestedItem.href}>
                                                                <Link
                                                                    href={nestedItem.href!}
                                                                    className="flex items-center gap-2 px-3 py-2 text-sm text-primary-foreground/80 hover:bg-white/20 hover:text-white rounded"
                                                                >
                                                                    <nestedItem.icon className="h-4 w-4" />
                                                                    <span>{nestedItem.label}</span>
                                                                </Link>
                                                            </li>
                                                        ))}
                                                    </div>
                                                );
                                            }
                                            return (
                                                <li key={subItem.href}>
                                                    <Link
                                                        href={subItem.href!}
                                                        className="flex items-center gap-2 px-3 py-2 text-sm text-primary-foreground/80 hover:bg-white/20 hover:text-white rounded mx-1"
                                                    >
                                                        <subItem.icon className="h-4 w-4" />
                                                        <span>{subItem.label}</span>
                                                    </Link>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            )}
                        </li>
                    );
                }

                // Expanded view for submenus
                return (
                    <li key={itemKey}>
                        <Collapsible
                            open={isOpen}
                            onOpenChange={() => toggleSection(item.label)}
                        >
                            <CollapsibleTrigger className={cn(
                                "flex items-center justify-between w-full gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 text-primary-foreground/80 hover:bg-white/20 hover:text-white",
                                isOpen && "bg-white/10"
                            )}>
                                <div className="flex items-center gap-3">
                                    <item.icon className="h-5 w-5" />
                                    <span className="font-medium">{item.label}</span>
                                </div>
                                <ChevronDown className={cn(
                                    "h-4 w-4 transition-transform",
                                    isOpen && "rotate-180"
                                )} />
                            </CollapsibleTrigger>
                            <CollapsibleContent className="pl-8 space-y-1 py-1">
                                <ul className="space-y-1">
                                    {renderNavItems(item.subItems, level + 1, item.label)}
                                </ul>
                            </CollapsibleContent>
                        </Collapsible>
                    </li>
                );
            }

            // Single item
            const isActive = pathname === item.href;
            
            if (isCollapsed) {
                return (
                    <li key={item.href} className="relative group">
                        <Link
                            href={item.href!}
                            className={cn(
                                "flex items-center justify-center p-3 rounded-lg cursor-pointer transition-all duration-200",
                                isActive 
                                    ? "bg-white/20 text-white" 
                                    : "text-primary-foreground/80 hover:bg-white/20 hover:text-white"
                            )}
                        >
                            <item.icon className="h-5 w-5" />
                        </Link>
                        {/* Tooltip */}
                        <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                            {item.label}
                            {item.permission && (
                                <div className="text-[10px] text-gray-300 mt-1">
                                    {item.permission.replace('view_', '')}
                                </div>
                            )}
                        </div>
                    </li>
                );
            }

            return (
                <li key={item.href}>
                    <DraggableNavItem item={item} />
                </li>
            );
            

            
        });
    };

    // Mobile sidebar
    if (isMobile && !mobileOpen) {
        return (
            <button
                onClick={() => setMobileOpen(true)}
                className="fixed top-4 left-4 z-50 p-2 bg-primary text-primary-foreground rounded-lg shadow-lg"
            >
                <Menu className="h-6 w-6" />
            </button>
        );
    }
    const sidebarContent = (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <aside className={cn(
                "h-screen flex-shrink-0 bg-gradient-to-b from-primary to-primary/90 border-r shadow-xl flex flex-col transition-all duration-300 ease-in-out",
                isCollapsed ? "w-16" : "w-64",
                isMobile ? "fixed inset-y-0 left-0 z-50" : "relative"
            )}>
                {/* Header */}
                <div className={cn(
                    "p-4 flex items-center justify-between border-b border-white/20",
                    isCollapsed ? "flex-col gap-2" : ""
                )}>
                    <div className="flex items-center gap-2">
                        <Library className={cn(
                            "text-primary-foreground transition-all",
                            isCollapsed ? "h-6 w-6" : "h-8 w-8"
                        )} />
                        {!isCollapsed && (
                            <div>
                                <h2 className="text-2xl font-bold text-primary-foreground">ClearBooks</h2>
                                <p className="text-xs text-primary-foreground/70">Accounting Pro</p>
                            </div>
                        )}
                    </div>
                    
                    {/* Collapse Toggle */}
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className={cn(
                            "p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-primary-foreground transition-colors",
                            isCollapsed ? "self-center" : ""
                        )}
                        title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                    >
                        {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                    </button>
                    
                    {/* Mobile Close Button */}
                    {isMobile && (
                        <button
                            onClick={() => setMobileOpen(false)}
                            className="md:hidden p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-primary-foreground"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
    
                {/* User Info (Only in expanded mode) */}
                {!isCollapsed && (
                    <div className="p-4 border-b border-white/20">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <UserCircle className="h-10 w-10 text-primary-foreground" />
                                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-primary"></div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-primary-foreground truncate">
                                    {user.full_name}
                                </p>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs px-2 py-0.5 bg-white/20 text-primary-foreground rounded-full capitalize">
                                        {user.role}
                                    </span>
                                    <span className="text-xs text-primary-foreground/70 truncate">
                                        ID: {user.company_id}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
    
                {/* Navigation */}
                <ScrollArea className="flex-grow py-4">
                    <nav className="px-2">
                        <ul className="space-y-1">
                            {renderNavItems(navItems)}
                        </ul>
                    </nav>
                </ScrollArea>
    
                {/* Quick Actions (Only in expanded mode) */}
                
                    {!isCollapsed && <QuickActionsDropZone />}

                   
                
    
                {/* Footer */}
                <div className="p-4 border-t border-white/20">
                    {isCollapsed ? (
                        <div className="flex flex-col items-center space-y-2">
                            <button
                                onClick={logout}
                                className="p-2 rounded-lg hover:bg-white/20 text-primary-foreground"
                                title="Logout"
                            >
                                <LogOut className="h-5 w-5" />
                            </button>
                            <div className="text-center">
                                <div className="w-6 h-6 mx-auto mb-1 flex items-center justify-center rounded-full bg-white/10">
                                    <span className="text-xs text-primary-foreground">PRO</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            <button
                                onClick={logout}
                                className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 text-primary-foreground/80 hover:bg-white/20 hover:text-white w-full"
                            >
                                <LogOut className="h-5 w-5" />
                                <span className="font-medium">Logout</span>
                            </button>
                            <div className="mt-3 pt-3 border-t border-white/20 text-center">
                                <div className="flex items-center justify-center gap-2 mb-1">
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                    <span className="text-xs text-primary-foreground/70">System Active</span>
                                </div>
                                <p className="text-xs text-primary-foreground/70">
                                    &copy; 2026 ClearBooks Pro v2.1
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </aside>
        </DndContext>
    );
    

    // For mobile, add overlay
    if (isMobile) {
        return (
            <>
                <div 
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={() => setMobileOpen(false)}
                />
                {sidebarContent}
            </>
        );
    }

    return sidebarContent;
}