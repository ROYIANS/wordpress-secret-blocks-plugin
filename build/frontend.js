/**
 * Secret Blocks - 前端交互脚本
 * 处理隐形文本 hover/click 效果，以及加密区块的密码解锁
 */
( function() {
    'use strict';

    /**
     * 使用密码解密内容（AES-GCM，与编辑器端对称）
     */
    async function decryptContent( encryptedBase64, password ) {
        const combined = Uint8Array.from( atob( encryptedBase64 ), c => c.charCodeAt( 0 ) );
        const salt = combined.slice( 0, 16 );
        const iv = combined.slice( 16, 28 );
        const data = combined.slice( 28 );

        const encoder = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            encoder.encode( password ),
            { name: 'PBKDF2' },
            false,
            [ 'deriveKey' ]
        );
        const key = await crypto.subtle.deriveKey(
            { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            [ 'decrypt' ]
        );
        const decrypted = await crypto.subtle.decrypt( { name: 'AES-GCM', iv }, key, data );
        return new TextDecoder().decode( decrypted );
    }

    async function hashPassword( password ) {
        const encoder = new TextEncoder();
        const data = encoder.encode( password + 'sb_salt_2024' );
        const hashBuffer = await crypto.subtle.digest( 'SHA-256', data );
        const hashArray = Array.from( new Uint8Array( hashBuffer ) );
        return hashArray.map( b => b.toString( 16 ).padStart( 2, '0' ) ).join( '' );
    }

    /**
     * 初始化加密区块的解锁逻辑
     */
    function initEncryptedBlocks() {
        const blocks = document.querySelectorAll( '.sb-encrypted-block' );
        blocks.forEach( function( block ) {
            const encryptedData = block.getAttribute( 'data-encrypted' );
            const storedHash = block.getAttribute( 'data-hash' );
            const inputEl = block.querySelector( '.sb-password-input' );
            const unlockBtn = block.querySelector( '.sb-unlock-btn' );
            const errorMsg = block.querySelector( '.sb-error-msg' );
            const lockScreen = block.querySelector( '.sb-lock-screen' );
            const contentEl = block.querySelector( '.sb-unlocked-content' );

            if ( ! inputEl || ! unlockBtn ) return;

            async function attemptUnlock() {
                const password = inputEl.value;
                if ( ! password ) return;

                unlockBtn.classList.add( 'sb-loading' );
                errorMsg.style.display = 'none';

                try {
                    const hash = await hashPassword( password );
                    if ( hash !== storedHash ) {
                        errorMsg.style.display = 'block';
                        inputEl.classList.add( 'sb-shake' );
                        setTimeout( () => inputEl.classList.remove( 'sb-shake' ), 600 );
                        unlockBtn.classList.remove( 'sb-loading' );
                        return;
                    }

                    const plaintext = await decryptContent( encryptedData, password );
                    contentEl.innerHTML = plaintext;

                    // 动画过渡
                    lockScreen.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
                    lockScreen.style.opacity = '0';
                    lockScreen.style.transform = 'translateY(-8px)';
                    setTimeout( () => {
                        lockScreen.style.display = 'none';
                        contentEl.style.display = 'block';
                        contentEl.style.opacity = '0';
                        contentEl.style.transform = 'translateY(8px)';
                        requestAnimationFrame( () => {
                            contentEl.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
                            contentEl.style.opacity = '1';
                            contentEl.style.transform = 'translateY(0)';
                        } );
                    }, 400 );

                    // 清除敏感数据
                    block.removeAttribute( 'data-encrypted' );
                    block.removeAttribute( 'data-hash' );
                } catch ( e ) {
                    errorMsg.style.display = 'block';
                    errorMsg.textContent = '解密失败，密码可能有误。';
                }
                unlockBtn.classList.remove( 'sb-loading' );
            }

            unlockBtn.addEventListener( 'click', attemptUnlock );
            inputEl.addEventListener( 'keydown', function( e ) {
                if ( e.key === 'Enter' ) attemptUnlock();
            } );
        } );
    }

    /**
     * 初始化隐形文本
     * 前端直接通过 CSS class 控制，JS 只处理点击 toggle 固定显示
     */
    function initHiddenText() {
        const elements = document.querySelectorAll( '.sb-hidden-text' );
        elements.forEach( function( el ) {
            // 点击切换固定显示状态
            el.addEventListener( 'click', function() {
                el.classList.toggle( 'sb-revealed' );
            } );

            // 为屏幕阅读器添加提示
            el.setAttribute( 'role', 'button' );
            el.setAttribute( 'tabindex', '0' );
            el.setAttribute( 'title', '点击显示/隐藏内容' );
            el.addEventListener( 'keydown', function( e ) {
                if ( e.key === 'Enter' || e.key === ' ' ) {
                    e.preventDefault();
                    el.classList.toggle( 'sb-revealed' );
                }
            } );
        } );
    }

    // DOM 就绪后初始化
    if ( document.readyState === 'loading' ) {
        document.addEventListener( 'DOMContentLoaded', function() {
            initEncryptedBlocks();
            initHiddenText();
        } );
    } else {
        initEncryptedBlocks();
        initHiddenText();
    }
} )();
