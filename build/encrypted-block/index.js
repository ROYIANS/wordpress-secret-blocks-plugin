/**
 * Secret Blocks - Encrypted Block (rewritten)
 *
 * 核心架构：
 * - 用 RichText 存储内容为 HTML 字符串，而非 InnerBlocks
 * - save() 输出静态 HTML，前端不会有编辑器 UI
 * - 编辑器里内容始终可见可编辑，密码只是"前端访客锁"配置
 * - 明文绝不输出到前端 HTML
 */
( function( wp ) {
    if ( ! wp || ! wp.blocks ) return;

    const { registerBlockType } = wp.blocks;
    const { RichText, InspectorControls, useBlockProps } = wp.blockEditor;
    const { PanelBody, TextControl, Button, Notice } = wp.components;
    const { useState } = wp.element;
    const el = wp.element.createElement;

    const LockIcon = el( 'svg', { viewBox: '0 0 24 24', fill: 'none', xmlns: 'http://www.w3.org/2000/svg', width: 20, height: 20 },
        el( 'rect', { x: 5, y: 11, width: 14, height: 10, rx: 2, stroke: 'currentColor', strokeWidth: 1.5 } ),
        el( 'path', { d: 'M8 11V7a4 4 0 0 1 8 0v4', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' } ),
        el( 'circle', { cx: 12, cy: 16, r: 1.5, fill: 'currentColor' } )
    );

    async function hashPassword( password ) {
        const enc = new TextEncoder();
        const buf = await crypto.subtle.digest( 'SHA-256', enc.encode( password + 'sb_salt_2024' ) );
        return Array.from( new Uint8Array( buf ) ).map( b => b.toString(16).padStart(2,'0') ).join('');
    }

    async function encryptContent( plaintext, password ) {
        const enc = new TextEncoder();
        const keyMat = await crypto.subtle.importKey( 'raw', enc.encode( password ), { name: 'PBKDF2' }, false, ['deriveKey'] );
        const salt = crypto.getRandomValues( new Uint8Array(16) );
        const key = await crypto.subtle.deriveKey(
            { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
            keyMat, { name: 'AES-GCM', length: 256 }, false, ['encrypt']
        );
        const iv = crypto.getRandomValues( new Uint8Array(12) );
        const cipher = await crypto.subtle.encrypt( { name: 'AES-GCM', iv }, key, enc.encode( plaintext ) );
        const combined = new Uint8Array( 28 + cipher.byteLength );
        combined.set( salt, 0 ); combined.set( iv, 16 ); combined.set( new Uint8Array( cipher ), 28 );
        return btoa( String.fromCharCode( ...combined ) );
    }

    registerBlockType( 'secret-blocks/encrypted-block', {
        title: '加密区块',
        description: '用密码保护内容，前端访客需输入密码才能查看。编辑器中内容始终可见。',
        category: 'common',
        icon: LockIcon,
        supports: { html: false },
        attributes: {
            content:          { type: 'string', default: '' },
            encryptedContent: { type: 'string', default: '' },
            passwordHash:     { type: 'string', default: '' },
            hint:             { type: 'string', default: '' },
            isProtected:      { type: 'boolean', default: false },
        },

        edit: function( { attributes, setAttributes } ) {
            const { content, hint, isProtected } = attributes;
            const blockProps = useBlockProps( { className: 'sb-encrypted-block-editor' } );
            const [ password, setPassword ]     = useState('');
            const [ confirmPwd, setConfirmPwd ] = useState('');
            const [ pwdError, setPwdError ]     = useState('');
            const [ isSaving, setIsSaving ]     = useState(false);
            const [ needsUpdate, setNeedsUpdate ] = useState(false);

            const handleSetPassword = async () => {
                if ( ! password )             { setPwdError('请输入密码'); return; }
                if ( password !== confirmPwd ) { setPwdError('两次密码不一致'); return; }
                if ( password.length < 4 )    { setPwdError('密码至少需要4位'); return; }
                if ( ! content )              { setPwdError('请先输入要保护的内容'); return; }
                setIsSaving(true); setPwdError('');
                try {
                    const encrypted = await encryptContent( content, password );
                    const hash      = await hashPassword( password );
                    setAttributes({ encryptedContent: encrypted, passwordHash: hash, isProtected: true });
                    setPassword(''); setConfirmPwd(''); setNeedsUpdate(false);
                } catch(e) { setPwdError('操作失败：' + e.message); }
                setIsSaving(false);
            };

            const handleRemovePassword = () => {
                setAttributes({ encryptedContent: '', passwordHash: '', isProtected: false });
                setPwdError(''); setPassword(''); setConfirmPwd(''); setNeedsUpdate(false);
            };

            const handleContentChange = (val) => {
                setAttributes({ content: val });
                if ( isProtected ) setNeedsUpdate(true);
            };

            const sidebar = el( InspectorControls, null,
                el( PanelBody, { title: '密码保护设置', initialOpen: true },
                    el( 'p', { style: { fontSize: '12px', color: '#757575', marginBottom: '12px', lineHeight: 1.5 } },
                        '编辑器中内容始终可见。密码只影响前端访客的可见性。' ),

                    isProtected && ! needsUpdate && el( Notice, { status: 'success', isDismissible: false, style: { marginBottom: '12px' } },
                        '🔒 已设置密码保护' ),
                    needsUpdate && el( Notice, { status: 'warning', isDismissible: false, style: { marginBottom: '12px' } },
                        '内容已修改，请重新设置密码以更新加密。' ),

                    el( TextControl, { label: isProtected ? '更新密码' : '设置密码', type: 'password', value: password,
                        onChange: v => { setPassword(v); setPwdError(''); }, placeholder: '输入密码（至少4位）' } ),
                    el( TextControl, { label: '确认密码', type: 'password', value: confirmPwd,
                        onChange: v => { setConfirmPwd(v); setPwdError(''); }, placeholder: '再次输入密码' } ),
                    el( TextControl, { label: '密码提示（可选，前端可见）', value: hint,
                        onChange: v => setAttributes({ hint: v }), placeholder: '给读者的提示' } ),

                    pwdError && el( Notice, { status: 'error', isDismissible: false, style: { marginBottom: '8px' } }, pwdError ),

                    el( Button, { variant: 'primary', onClick: handleSetPassword, disabled: isSaving,
                        style: { width: '100%', justifyContent: 'center', marginBottom: '8px' } },
                        isSaving ? '处理中...' : ( isProtected ? '🔒 更新密码' : '🔒 设置密码' ) ),

                    isProtected && el( Button, { variant: 'secondary', isDestructive: true, onClick: handleRemovePassword,
                        style: { width: '100%', justifyContent: 'center' } }, '🔓 移除密码保护' )
                )
            );

            const body = el( 'div', { className: 'sb-unlocked-editor' },
                el( 'div', { className: 'sb-editor-header' + ( isProtected && ! needsUpdate ? ' is-protected' : needsUpdate ? ' needs-update' : '' ) },
                    el( 'span', { className: 'sb-editor-badge' },
                        isProtected && ! needsUpdate ? '🔒 已设置密码 — 前端访客需输入密码查看'
                        : needsUpdate ? '⚠️ 内容已修改，请在右侧面板更新密码'
                        : '🔓 未设置密码 — 在右侧面板设置密码以保护内容' )
                ),
                el( RichText, {
                    tagName: 'div',
                    className: 'sb-editor-content',
                    value: content,
                    onChange: handleContentChange,
                    placeholder: '在这里输入要加密保护的内容...',
                    multiline: 'p',
                } )
            );

            return el( 'div', blockProps, sidebar, body );
        },

        save: function( { attributes } ) {
            const { content, encryptedContent, passwordHash, hint, isProtected } = attributes;
            const blockProps = useBlockProps.save();

            // 未设置密码：直接输出内容，和普通区块一样
            if ( ! isProtected || ! encryptedContent || ! passwordHash ) {
                return el( 'div', blockProps,
                    el( RichText.Content, { tagName: 'div', value: content } )
                );
            }

            // 已加密：输出锁屏 + 数据容器（明文不出现在前端）
            return el( 'div', { ...blockProps, className: ( blockProps.className || '' ) + ' sb-encrypted-block' },
                el( 'div', { className: 'sb-enc-data', 'data-encrypted': encryptedContent, 'data-hash': passwordHash, 'data-hint': hint || '', style: { display: 'none' } } ),
                el( 'div', { className: 'sb-lock-screen' },
                    el( 'div', { className: 'sb-lock-icon-wrap' },
                        el( 'svg', { viewBox: '0 0 24 24', fill: 'none', className: 'sb-lock-svg' },
                            el( 'rect', { x: 5, y: 11, width: 14, height: 10, rx: 2, stroke: 'currentColor', strokeWidth: '1.5' } ),
                            el( 'path', { d: 'M8 11V7a4 4 0 0 1 8 0v4', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round' } ),
                            el( 'circle', { cx: 12, cy: 16, r: 1.5, fill: 'currentColor' } )
                        )
                    ),
                    el( 'p', { className: 'sb-lock-title' }, '内容已加密' ),
                    hint ? el( 'p', { className: 'sb-lock-hint' }, '提示：' + hint ) : null,
                    el( 'div', { className: 'sb-input-wrap' },
                        el( 'input', { type: 'password', className: 'sb-password-input', placeholder: '输入密码以查看内容', autoComplete: 'off' } ),
                        el( 'button', { className: 'sb-unlock-btn', type: 'button' },
                            el( 'svg', { viewBox: '0 0 24 24', fill: 'none' },
                                el( 'path', { d: 'M5 12h14M13 6l6 6-6 6', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round' } )
                            )
                        )
                    ),
                    el( 'p', { className: 'sb-error-msg' } )
                ),
                el( 'div', { className: 'sb-unlocked-content' } )
            );
        },
    } );

} )( window.wp );
