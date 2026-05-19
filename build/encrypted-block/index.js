/**
 * Secret Blocks - Encrypted Block (built)
 * 加密区块 - 已编译版本
 */
( function( wp ) {
    if ( ! wp || ! wp.blocks ) return;

    const { registerBlockType } = wp.blocks;
    const { InnerBlocks, InspectorControls, useBlockProps } = wp.blockEditor;
    const { PanelBody, TextControl, Button, Notice } = wp.components;
    const { useState } = wp.element;
    const el = wp.element.createElement;

    const LockIcon = el( 'svg', { viewBox: '0 0 24 24', fill: 'none', xmlns: 'http://www.w3.org/2000/svg', width: 20, height: 20 },
        el( 'rect', { x: 5, y: 11, width: 14, height: 10, rx: 2, stroke: 'currentColor', strokeWidth: 1.5 } ),
        el( 'path', { d: 'M8 11V7a4 4 0 0 1 8 0v4', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' } ),
        el( 'circle', { cx: 12, cy: 16, r: 1.5, fill: 'currentColor' } )
    );

    async function hashPassword( password ) {
        const encoder = new TextEncoder();
        const data = encoder.encode( password + 'sb_salt_2024' );
        const hashBuffer = await crypto.subtle.digest( 'SHA-256', data );
        const hashArray = Array.from( new Uint8Array( hashBuffer ) );
        return hashArray.map( b => b.toString( 16 ).padStart( 2, '0' ) ).join( '' );
    }

    async function encryptContent( plaintext, password ) {
        const encoder = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            'raw', encoder.encode( password ), { name: 'PBKDF2' }, false, [ 'deriveKey' ]
        );
        const salt = crypto.getRandomValues( new Uint8Array( 16 ) );
        const key = await crypto.subtle.deriveKey(
            { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
            keyMaterial,
            { name: 'AES-GCM', length: 256 }, false, [ 'encrypt' ]
        );
        const iv = crypto.getRandomValues( new Uint8Array( 12 ) );
        const encrypted = await crypto.subtle.encrypt( { name: 'AES-GCM', iv }, key, encoder.encode( plaintext ) );
        const combined = new Uint8Array( salt.length + iv.length + encrypted.byteLength );
        combined.set( salt, 0 );
        combined.set( iv, salt.length );
        combined.set( new Uint8Array( encrypted ), salt.length + iv.length );
        return btoa( String.fromCharCode( ...combined ) );
    }

    registerBlockType( 'secret-blocks/encrypted-block', {
        title: '加密区块',
        description: '用密码保护此区块的内容，访客必须输入正确密码才能查看。',
        category: 'common',
        icon: LockIcon,
        supports: { html: false },
        attributes: {
            encryptedContent: { type: 'string', default: '' },
            passwordHash:     { type: 'string', default: '' },
            hint:             { type: 'string', default: '' },
            isLocked:         { type: 'boolean', default: false },
        },

        edit: function( { attributes, setAttributes, clientId } ) {
            const { encryptedContent, passwordHash, hint, isLocked } = attributes;
            const blockProps = useBlockProps( { className: 'sb-encrypted-block-editor' } );
            const [ password, setPassword ]           = useState( '' );
            const [ confirmPassword, setConfirmPassword ] = useState( '' );
            const [ passwordError, setPasswordError ] = useState( '' );
            const [ unlockPassword, setUnlockPassword ] = useState( '' );
            const [ unlockError, setUnlockError ]     = useState( '' );
            const [ isEncrypting, setIsEncrypting ]   = useState( false );

            const handleLock = async () => {
                if ( ! password )                   { setPasswordError( '请输入密码' ); return; }
                if ( password !== confirmPassword )  { setPasswordError( '两次密码不一致' ); return; }
                if ( password.length < 4 )           { setPasswordError( '密码至少需要4位' ); return; }

                setIsEncrypting( true );
                setPasswordError( '' );
                try {
                    // 获取 InnerBlocks 渲染的 HTML
                    const innerEl = document.querySelector( `[data-block="${clientId}"] .sb-inner-blocks-wrap` );
                    const contentHTML = innerEl ? innerEl.innerHTML : '<p>（内容）</p>';
                    const encrypted  = await encryptContent( contentHTML, password );
                    const hash       = await hashPassword( password );
                    setAttributes( { encryptedContent: encrypted, passwordHash: hash, isLocked: true } );
                    setPassword( '' );
                    setConfirmPassword( '' );
                } catch( e ) {
                    setPasswordError( '加密失败：' + e.message );
                }
                setIsEncrypting( false );
            };

            const handleUnlock = async () => {
                const hash = await hashPassword( unlockPassword );
                if ( hash === passwordHash ) {
                    setAttributes( { isLocked: false, encryptedContent: '', passwordHash: '' } );
                    setUnlockPassword( '' );
                    setUnlockError( '' );
                } else {
                    setUnlockError( '密码错误，请重试' );
                }
            };

            // 侧边栏
            const sidebar = el( InspectorControls, null,
                el( PanelBody, { title: '加密设置', initialOpen: true },
                    ! isLocked
                    ? el( wp.element.Fragment, null,
                        el( TextControl, { label: '设置密码', type: 'password', value: password,
                            onChange: v => { setPassword( v ); setPasswordError( '' ); },
                            placeholder: '输入密码（至少4位）' } ),
                        el( TextControl, { label: '确认密码', type: 'password', value: confirmPassword,
                            onChange: v => { setConfirmPassword( v ); setPasswordError( '' ); },
                            placeholder: '再次输入密码' } ),
                        el( TextControl, { label: '密码提示（可选）', value: hint,
                            onChange: v => setAttributes( { hint: v } ),
                            placeholder: '给读者的提示' } ),
                        passwordError && el( Notice, { status: 'error', isDismissible: false }, passwordError ),
                        el( Button, { variant: 'primary', onClick: handleLock, disabled: isEncrypting,
                            style: { marginTop: '8px', width: '100%', justifyContent: 'center' } },
                            isEncrypting ? '加密中...' : '🔒 加密此区块' )
                    )
                    : el( wp.element.Fragment, null,
                        el( Notice, { status: 'success', isDismissible: false }, '✅ 此区块已加密' ),
                        el( TextControl, { label: '输入密码解锁编辑', type: 'password', value: unlockPassword,
                            onChange: v => { setUnlockPassword( v ); setUnlockError( '' ); },
                            placeholder: '输入原密码' } ),
                        unlockError && el( Notice, { status: 'error', isDismissible: false }, unlockError ),
                        el( Button, { variant: 'secondary', onClick: handleUnlock,
                            style: { marginTop: '8px', width: '100%', justifyContent: 'center' } },
                            '🔓 解锁区块' )
                    )
                )
            );

            // 区块主体
            const body = isLocked
                ? el( 'div', { className: 'sb-encrypted-preview' },
                    el( 'div', { className: 'sb-encrypted-preview-icon' }, '🔒' ),
                    el( 'p', { className: 'sb-encrypted-preview-title' }, '区块已加密' ),
                    el( 'p', { className: 'sb-encrypted-preview-desc' },
                        '在左侧面板输入密码可解锁编辑。前端访客需输入密码才能查看内容。' ),
                    hint && el( 'p', { className: 'sb-encrypted-preview-hint' }, `提示：${ hint }` )
                )
                : el( 'div', { className: 'sb-unlocked-editor' },
                    el( 'div', { className: 'sb-editor-header' },
                        el( 'span', { className: 'sb-editor-badge' }, '🔓 未加密 — 在右侧面板设置密码后点击加密' )
                    ),
                    el( 'div', { className: 'sb-inner-blocks-wrap' },
                        el( InnerBlocks, {
                            template: [ [ 'core/paragraph', { placeholder: '在这里输入要加密的内容...' } ] ],
                        } )
                    )
                );

            return el( 'div', blockProps, sidebar, body );
        },

        save: function() {
            return null; // 服务端渲染
        },
    } );

} )( window.wp );
