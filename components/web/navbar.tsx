"use client"
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "./theme-toggle";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { Menu, X, ChevronDown, ChevronUp } from "lucide-react";

export function Navbar() {
    const { isAuthenticated, user, logout, isLoading } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isDashboardOpen, setIsDashboardOpen] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    
    // Ensure component is mounted before rendering dynamic content
    useEffect(() => {
        setIsMounted(true);
    }, []);
    
    // Close sidebar when route changes
    useEffect(() => {
        const handleRouteChange = () => {
            setIsSidebarOpen(false);
            setIsDashboardOpen(false);
        };
        window.addEventListener('routeChangeComplete', handleRouteChange);
        return () => window.removeEventListener('routeChangeComplete', handleRouteChange);
    }, []);

    return (
        <>
            <nav className="w-full py-4 sm:py-5 flex items-center justify-between border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 fixed top-0 left-0 right-0 z-50" suppressHydrationWarning={true}>
                <div className="container mx-auto px-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {/* Mobile menu button - only shown on small screens */}
                        <button 
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="md:hidden p-2 rounded-md hover:bg-accent"
                            aria-label="Toggle menu"
                        >
                            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                        
                        <Link href="/" className="flex items-center gap-2">
                            <div className="relative w-[120px] h-[30px] sm:w-[140px] sm:h-[40px]">
                                <Image
                                    src="/logo.png"
                                    alt="TLA Logo"
                                    fill
                                    priority
                                    unoptimized
                                    className="object-contain"
                                    onError={(e) => {
                                        console.error('Failed to load logo');
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                    }}
                                />
                            </div>
                        </Link>

                        {/* Desktop Navigation - only shown on medium screens and up */}
                        <div className="hidden md:flex items-center gap-1 ml-6">
                            <Link className={buttonVariants({variant:'ghost'})} href='/'>
                                Home
                            </Link>
                            <Link className={buttonVariants({variant:'ghost'})} href='/about'>
                                About
                            </Link>
                            <Link className={buttonVariants({variant:'ghost'})} href='/contact'>
                                Contact
                            </Link>
                            {/* Always render a placeholder for auth-dependent navigation */}
                            <div suppressHydrationWarning={true}>
                                {isMounted && isAuthenticated ? (
                                    <>
                                        <Link 
                                            href={user?.isAdmin ? '/admin' : '/dashboard'}
                                            className={buttonVariants({variant:'ghost'})}
                                        >
                                            {user?.isAdmin ? 'Admin Dashboard' : 'Dashboard'}
                                        </Link>
                                        {!user?.isAdmin && (
                                            <Link 
                                                href="/dashboard/payment"
                                                className={`${buttonVariants({variant:'ghost'})} flex items-center gap-1`}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                                                    <rect width="20" height="14" x="2" y="5" rx="2" />
                                                    <line x1="2" x2="22" y1="10" y2="10" />
                                                </svg>
                                                Payment
                                            </Link>
                                        )}
                                    </>
                                ) : isMounted ? (
                                    <>
                                        {/* <Link 
                                            href="/auth/login"
                                            className={buttonVariants({ variant: 'outline' })}
                                        >
                                            Login
                                        </Link> */}
                                        {/* <Link 
                                            href="/auth/signup"
                                            className={buttonVariants()}
                                        >
                                            Sign Up
                                        </Link> */}
                                    </>
                                ) : (
                                    // Placeholder to maintain consistent layout
                                    <div className="w-32 h-9 invisible"></div>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <ThemeToggle />
                        {/* Always render a placeholder for auth-dependent user section */}
                        <div suppressHydrationWarning={true}>
                            {isMounted && (isAuthenticated ? (
                                <div className="hidden md:flex items-center gap-2">
                                    <span className="text-sm font-medium text-foreground max-w-[120px] truncate">
                                        {user?.name || user?.email?.split('@')[0]}
                                    </span>
                                    <button
                                        onClick={logout}
                                        className={buttonVariants({ variant: 'ghost', size: 'sm' })}
                                    >
                                        Logout
                                    </button>
                                </div>
                            ) : (
                                <div className="hidden md:flex items-center gap-2">
                                    <Link 
                                        href="/auth/login"
                                        className={buttonVariants({ variant: 'outline' })}
                                    >
                                        Login
                                    </Link>
                                    <Link 
                                        href="/auth/signup"
                                        className={buttonVariants()}
                                    >
                                        Sign Up
                                    </Link>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </nav>

            {/* Mobile Sidebar - only shown on small screens */}
            <div className={`md:hidden fixed inset-0 z-40 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out`}>
                <div 
                    className="fixed inset-0 bg-black/50"
                    onClick={() => {
                        setIsSidebarOpen(false);
                        setIsDashboardOpen(false);
                    }}
                />
                <div className="fixed inset-y-0 left-0 w-64 bg-background border-r border-border overflow-y-auto">
                    <div className="p-4">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-semibold">Menu</h2>
                            <button 
                                onClick={() => {
                                    setIsSidebarOpen(false);
                                    setIsDashboardOpen(false);
                                }}
                                className="p-2 rounded-md hover:bg-accent"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        
                        <nav className="space-y-2">
                            <Link 
                                href="/" 
                                className="block px-4 py-2 rounded-md hover:bg-accent"
                                onClick={() => setIsSidebarOpen(false)}
                            >
                                Home
                            </Link>
                            <Link 
                                href="/about" 
                                className="block px-4 py-2 rounded-md hover:bg-accent"
                                onClick={() => setIsSidebarOpen(false)}
                            >
                                About
                            </Link>
                            <Link 
                                href="/contact" 
                                className="block px-4 py-2 rounded-md hover:bg-accent"
                                onClick={() => setIsSidebarOpen(false)}
                            >
                                Contact
                            </Link>
                            
                            {isMounted && isAuthenticated ? (
                                <>
                                    <div className="border-t border-border my-2"></div>
                                    
                                    {user?.isAdmin ? (
                                        <Link 
                                            href="/admin"
                                            className="block px-4 py-2 rounded-md hover:bg-accent"
                                            onClick={() => setIsSidebarOpen(false)}
                                        >
                                            Admin Dashboard
                                        </Link>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => setIsDashboardOpen(!isDashboardOpen)}
                                                className="w-full flex items-center justify-between px-4 py-2 rounded-md hover:bg-accent"
                                            >
                                                <span>Dashboard</span>
                                                {isDashboardOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                            </button>
                                            
                                            {isDashboardOpen && (
                                                <div className="ml-4 mt-1 space-y-1">
                                                    <Link 
                                                        href="/dashboard/membership-card"
                                                        className="block px-4 py-2 text-sm rounded-md hover:bg-accent"
                                                        onClick={() => setIsSidebarOpen(false)}
                                                    >
                                                        Membership Card
                                                    </Link>
                                                    <Link 
                                                        href="/dashboard/complete-profile"
                                                        className="block px-4 py-2 text-sm rounded-md hover:bg-accent"
                                                        onClick={() => setIsSidebarOpen(false)}
                                                    >
                                                        Manage Profile
                                                    </Link>
                                                    <Link 
                                                        href="/dashboard/payment"
                                                        className="flex items-center gap-2 px-4 py-2 text-sm rounded-md hover:bg-accent"
                                                        onClick={() => setIsSidebarOpen(false)}
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                                                            <rect width="20" height="14" x="2" y="5" rx="2" />
                                                            <line x1="2" x2="22" y1="10" y2="10" />
                                                        </svg>
                                                        Payment
                                                    </Link>
                                                    <Link 
                                                        href="/dashboard/events"
                                                        className="block px-4 py-2 text-sm rounded-md hover:bg-accent"
                                                        onClick={() => setIsSidebarOpen(false)}
                                                    >
                                                        Upcoming Events
                                                    </Link>
                                                    <Link 
                                                        href="/dashboard/messages"
                                                        className="block px-4 py-2 text-sm rounded-md hover:bg-accent"
                                                        onClick={() => setIsSidebarOpen(false)}
                                                    >
                                                        Messages
                                                    </Link>
                                                </div>
                                            )}
                                        </>
                                    )}
                                    <button
                                        onClick={() => {
                                            logout();
                                            setIsSidebarOpen(false);
                                        }}
                                        className="w-full text-left px-4 py-2 rounded-md hover:bg-accent mt-2"
                                    >
                                        Logout
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div className="border-t border-border my-2"></div>
                                    <Link 
                                        href="/auth/login"
                                        className="block px-4 py-2 rounded-md hover:bg-accent"
                                        onClick={() => setIsSidebarOpen(false)}
                                    >
                                        Login
                                    </Link>
                                    <Link 
                                        href="/auth/signup"
                                        className="block px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                                        onClick={() => setIsSidebarOpen(false)}
                                    >
                                        Sign Up
                                    </Link>
                                </>
                            )}
                        </nav>
                    </div>
                </div>
            </div>
            
            {/* Add padding to account for fixed navbar */}
            <div className="h-16 md:h-20"></div>
        </>
    );
}