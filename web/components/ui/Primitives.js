import Image from 'next/image';
import Link from 'next/link';

export const botNumber = '628123456789';

export function cn(...classes) {
    return classes.filter(Boolean).join(' ');
}

export function PageShell({ children, className = '' }) {
    return (
        <main className={cn('hu-page landing-theme', className)}>
            {children}
        </main>
    );
}

export function AppHeader({
    navItems = [],
    actionHref = '/onboarding',
    actionLabel = 'Mulai',
    secondaryHref = '/login',
    secondaryLabel = 'Masuk'
}) {
    return (
        <header className="hu-nav">
            <div className="flex items-center justify-between gap-4 px-4 py-3 md:px-5">
                <Link href="/" className="flex min-w-0 items-center gap-3" aria-label="CuanBeres beranda">
                    <Image src="/logo.png" alt="CuanBeres" width={44} height={39} className="h-9 w-auto shrink-0" priority />
                    <span className="truncate text-lg font-medium text-black">CuanBeres</span>
                </Link>

                {navItems.length > 0 ? (
                    <nav className="hidden items-center gap-6 text-sm text-[#636363] md:flex" aria-label="Navigasi utama">
                        {navItems.map((item) => (
                            <a key={item.href} href={item.href} className="hover:text-black">
                                {item.label}
                            </a>
                        ))}
                    </nav>
                ) : null}

                <div className="flex items-center gap-2">
                    {secondaryHref ? (
                        <Link href={secondaryHref} className="hu-button hu-button-ghost hidden sm:inline-flex">
                            {secondaryLabel}
                        </Link>
                    ) : null}
                    {actionHref ? (
                        <Link href={actionHref} className="hu-button">
                            {actionLabel}
                        </Link>
                    ) : null}
                </div>
            </div>
        </header>
    );
}

export function ButtonLink({ href, children, variant = 'primary', className = '', external = false }) {
    const classes = cn(
        'hu-button',
        variant === 'secondary' && 'hu-button-secondary',
        variant === 'ghost' && 'hu-button-ghost',
        className
    );

    if (external) {
        return (
            <a href={href} target="_blank" rel="noreferrer" className={classes}>
                {children}
            </a>
        );
    }

    return (
        <Link href={href} className={classes}>
            {children}
        </Link>
    );
}

export function Button({ children, variant = 'primary', className = '', ...props }) {
    return (
        <button
            type={props.type || 'button'}
            className={cn(
                'hu-button',
                variant === 'secondary' && 'hu-button-secondary',
                variant === 'ghost' && 'hu-button-ghost',
                className
            )}
            {...props}
        >
            {children}
        </button>
    );
}

export function Surface({ as: Component = 'section', children, className = '' }) {
    return <Component className={cn('hu-card', className)}>{children}</Component>;
}

export function SectionIntro({ eyebrow, title, children, align = 'left', className = '' }) {
    return (
        <div className={cn(align === 'center' && 'text-center', className)}>
            {eyebrow ? <p className="hu-kicker">{eyebrow}</p> : null}
            {title ? <h2 className="hu-heading mt-4">{title}</h2> : null}
            {children ? <div className="hu-body mt-4">{children}</div> : null}
        </div>
    );
}

export function IconBubble({ children, className = '' }) {
    return (
        <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#efefef] text-black', className)}>
            {children}
        </div>
    );
}

export function Field({ id, label, icon, helper, children }) {
    return (
        <div className="space-y-2">
            <label className="hu-label" htmlFor={id}>
                {icon}
                {label}
            </label>
            {children}
            {helper ? <p className="hu-meta">{helper}</p> : null}
        </div>
    );
}
