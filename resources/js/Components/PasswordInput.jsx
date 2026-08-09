import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

export default forwardRef(function PasswordInput(
    {
        className = '',
        baseClassName = 'rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500',
        isFocused = false,
        ...props
    },
    ref,
) {
    const [visible, setVisible] = useState(false);
    const localRef = useRef(null);

    useImperativeHandle(ref, () => ({
        focus: () => localRef.current?.focus(),
    }));

    useEffect(() => {
        if (isFocused) {
            localRef.current?.focus();
        }
    }, [isFocused]);

    return (
        <div className="relative">
            <input
                {...props}
                type={visible ? 'text' : 'password'}
                ref={localRef}
                className={`${baseClassName} pr-9 ${className}`}
            />
            <button
                type="button"
                tabIndex={-1}
                onClick={() => setVisible(v => !v)}
                className="absolute inset-y-0 right-0 flex items-center px-2.5 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
                <i className={`ti ${visible ? 'ti-eye-off' : 'ti-eye'}`} style={{ fontSize: '15px' }} />
            </button>
        </div>
    );
});
