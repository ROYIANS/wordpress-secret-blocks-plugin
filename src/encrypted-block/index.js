/**
 * 加密区块 - Gutenberg Block 注册
 */
( function( wp ) {
    const { registerBlockType } = wp.blocks;
    const { InnerBlocks, InspectorControls, useBlockProps } = wp.blockEditor;
    const { PanelBody, TextControl, Button, Notice } = wp.components;
    const { useState, useEffect } = wp.element;
    const { __ } = wp.i18n;

    // 锁图标
    const LockIcon = wp.element.createElement(
        'svg',
        { viewBox: '0 0 24 24', fill: 'none', xmlns: 'http://www.w3.org/2000/svg', width: 20, height: 20 },
        wp.element.createElement( 'rect', { x: 5, y: 11, width: 14, height: 10, rx: 2, stroke: 'currentColor', strokeWidth: 1.5 } ),
        wp.element.createElement( 'path', { d: 'M8 11V7a4 4 0 0 1 8 0v4', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' } ),
        wp.element.createElement( 'circle', { cx: 12, cy: 16, r: 1.5, fill: 'currentColor' } )
    );

    /**
     * 简单哈希函数（用于密码验证，不用于安全加密）
     */
    async function hashPassword( password ) {
        const encoder = new TextEncoder();
        const data = encoder.encode( password + 'sb_salt_2024' );
        const hashBuffer = await crypto.subtle.digest( 'SHA-256', data );
        const hashArray = Array.from( new Uint8Array( hashBuffer ) );
        return hashArray.map( b => b.toString( 16 ).padStart( 2, '0' ) ).join( '' );
    }

    /**
     * 使用密码加密内容（AES-GCM）
     */
    async function encryptContent( plaintext, password ) {
        const encoder = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            encoder.encode( password ),
            { name: 'PBKDF2' },
            false,
            [ 'deriveKey' ]
        );
        const salt = crypto.getRandomValues( new Uint8Array( 16 ) );
        const key = await crypto.subtle.deriveKey(
            { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            [ 'encrypt' ]
        );
        const iv = crypto.getRandomValues( new Uint8Array( 12 ) );
        const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            key,
            encoder.encode( plaintext )
        );
        // 将 salt + iv + encrypted 合并并 base64
        const combined = new Uint8Array( salt.length + iv.length + encrypted.byteLength );
        combined.set( salt, 0 );
        combined.set( iv, salt.length );
        combined.set( new Uint8Array( encrypted ), salt.length + iv.length );
        return btoa( String.fromCharCode( ...combined ) );
    }

    registerBlockType( 'secret-blocks/encrypted-block', {
        title: __( '加密区块', 'secret-blocks' ),
        description: __( '用密码保护此区块的内容，访客必须输入正确密码才能查看。', 'secret-blocks' ),
        category: 'common',
        icon: LockIcon,
        supports: {
            html: false,
        },
        attributes: {
            encryptedContent: { type: 'string', default: '' },
            passwordHash: { type: 'string', default: '' },
            hint: { type: 'string', default: '' },
            isLocked: { type: 'boolean', default: false },
        },

        edit: function EditComponent( { attributes, setAttributes } ) {
            const { encryptedContent, passwordHash, hint, isLocked } = attributes;
            const blockProps = useBlockProps( { className: 'sb-encrypted-block-editor' } );
            const [ password, setPassword ] = useState( '' );
            const [ confirmPassword, setConfirmPassword ] = useState( '' );
            const [ passwordError, setPasswordError ] = useState( '' );
            const [ unlockPassword, setUnlockPassword ] = useState( '' );
            const [ unlockError, setUnlockError ] = useState( '' );
            const [ isEncrypting, setIsEncrypting ] = useState( false );

            const handleLock = async () => {
                if ( ! password ) {
                    setPasswordError( '请输入密码' );
                    return;
                }
                if ( password !== confirmPassword ) {
                    setPasswordError( '两次密码不一致' );
                    return;
                }
                if ( password.length < 4 ) {
                    setPasswordError( '密码至少需要4位' );
                    return;
                }
                setIsEncrypting( true );
                setPasswordError( '' );
                try {
                    // 获取区块内容的 HTML
                    const innerBlocksEl = document.querySelector( `[data-block="${blockProps['data-block']}"] .sb-inner-blocks-wrap` );
                    const contentHTML = innerBlocksEl ? innerBlocksEl.innerHTML : '<p>加密内容</p>';
                    const encrypted = await encryptContent( contentHTML, password );
                    const hash = await hashPassword( password );
                    setAttributes( { encryptedContent: encrypted, passwordHash: hash, isLocked: true } );
                    setPassword( '' );
                    setConfirmPassword( '' );
                } catch ( e ) {
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
                    setUnlockError( '密码错误' );
                }
            };

            return wp.element.createElement(
                'div',
                blockProps,
                // 侧边栏控制面板
                wp.element.createElement(
                    InspectorControls,
                    null,
                    wp.element.createElement(
                        PanelBody,
                        { title: __( '加密设置', 'secret-blocks' ), initialOpen: true },
                        ! isLocked
                            ? wp.element.createElement(
                                wp.element.Fragment,
                                null,
                                wp.element.createElement( TextControl, {
                                    label: __( '设置密码', 'secret-blocks' ),
                                    type: 'password',
                                    value: password,
                                    onChange: ( v ) => { setPassword( v ); setPasswordError( '' ); },
                                    placeholder: '输入密码（至少4位）',
                                } ),
                                wp.element.createElement( TextControl, {
                                    label: __( '确认密码', 'secret-blocks' ),
                                    type: 'password',
                                    value: confirmPassword,
                                    onChange: ( v ) => { setConfirmPassword( v ); setPasswordError( '' ); },
                                    placeholder: '再次输入密码',
                                } ),
                                wp.element.createElement( TextControl, {
                                    label: __( '密码提示（可选）', 'secret-blocks' ),
                                    value: hint,
                                    onChange: ( v ) => setAttributes( { hint: v } ),
                                    placeholder: '给读者的密码提示',
                                } ),
                                passwordError && wp.element.createElement(
                                    Notice,
                                    { status: 'error', isDismissible: false },
                                    passwordError
                                ),
                                wp.element.createElement(
                                    Button,
                                    {
                                        variant: 'primary',
                                        onClick: handleLock,
                                        disabled: isEncrypting,
                                        style: { marginTop: '8px', width: '100%', justifyContent: 'center' }
                                    },
                                    isEncrypting ? '加密中...' : '🔒 加密此区块'
                                )
                            )
                            : wp.element.createElement(
                                wp.element.Fragment,
                                null,
                                wp.element.createElement(
                                    Notice,
                                    { status: 'success', isDismissible: false },
                                    '✅ 此区块已加密'
                                ),
                                wp.element.createElement( TextControl, {
                                    label: __( '输入密码解锁编辑', 'secret-blocks' ),
                                    type: 'password',
                                    value: unlockPassword,
                                    onChange: ( v ) => { setUnlockPassword( v ); setUnlockError( '' ); },
                                    placeholder: '输入原密码',
                                } ),
                                unlockError && wp.element.createElement(
                                    Notice,
                                    { status: 'error', isDismissible: false },
                                    unlockError
                                ),
                                wp.element.createElement(
                                    Button,
                                    {
                                        variant: 'secondary',
                                        onClick: handleUnlock,
                                        style: { marginTop: '8px', width: '100%', justifyContent: 'center' }
                                    },
                                    '🔓 解锁区块'
                                )
                            )
                    )
                ),

                // 区块主体
                isLocked
                    ? wp.element.createElement(
                        'div',
                        { className: 'sb-encrypted-preview' },
                        wp.element.createElement( 'div', { className: 'sb-encrypted-preview-icon' }, '🔒' ),
                        wp.element.createElement( 'p', { className: 'sb-encrypted-preview-title' }, '区块已加密' ),
                        wp.element.createElement( 'p', { className: 'sb-encrypted-preview-desc' }, '在左侧面板输入密码可解锁编辑。前端访客需输入密码才能查看内容。' ),
                        hint && wp.element.createElement( 'p', { className: 'sb-encrypted-preview-hint' }, `提示：${ hint }` )
                    )
                    : wp.element.createElement(
                        'div',
                        { className: 'sb-unlocked-editor' },
                        wp.element.createElement(
                            'div',
                            { className: 'sb-editor-header' },
                            wp.element.createElement( 'span', { className: 'sb-editor-badge' }, '🔓 未加密 — 在侧边栏设置密码后点击加密' )
                        ),
                        wp.element.createElement(
                            'div',
                            { className: 'sb-inner-blocks-wrap' },
                            wp.element.createElement( InnerBlocks, {
                                template: [ [ 'core/paragraph', { placeholder: '在这里输入要加密的内容...' } ] ],
                            } )
                        )
                    )
            );
        },

        save: function() {
            // 使用服务端渲染，save 返回 null
            return null;
        },
    } );

} )( window.wp );
