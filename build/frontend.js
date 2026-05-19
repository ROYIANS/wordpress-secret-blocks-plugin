/**
 * Secret Blocks - 前端交互脚本
 * 处理隐形文本 hover/click 效果，以及加密区块的密码解锁
 */
( function() {
    'use strict';

    async function decryptContent( encryptedBase64, password ) {
        const combined = Uint8Array.from( atob( encryptedBase64 ), c => c.charCodeAt(0) );
        const salt = combined.slice(0, 16);
        const iv   = combined.slice(16, 28);
        const data = combined.slice(28);
        const enc  = new TextEncoder();
        const keyMat = await crypto.subtle.importKey( 'raw', enc.encode( password ), { name: 'PBKDF2' }, false, ['deriveKey'] );
        const key = await crypto.subtle.deriveKey(
            { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
            keyMat, { name: 'AES-GCM', length: 256 }, false, ['decrypt']
        );
        const decrypted = await crypto.subtle.decrypt( { name: 'AES-GCM', iv }, key, data );
        return new TextDecoder().decode( decrypted );
    }

    async function hashPassword( password ) {
        const enc = new TextEncoder();
        const buf = await crypto.subtle.digest( 'SHA-256', enc.encode( password + 'sb_salt_2024' ) );
        return Array.from( new Uint8Array( buf ) ).map( b => b.toString(16).padStart(2,'0') ).join('');
    }

    function initEncryptedBlocks() {
        document.querySelectorAll( '.sb-encrypted-block' ).forEach( function( block ) {
            const dataEl      = block.querySelector( '.sb-enc-data' );
            if ( ! dataEl ) return;

            const encData     = dataEl.getAttribute( 'data-encrypted' );
            const storedHash  = dataEl.getAttribute( 'data-hash' );
            const inputEl     = block.querySelector( '.sb-password-input' );
            const unlockBtn   = block.querySelector( '.sb-unlock-btn' );
            const errorMsg    = block.querySelector( '.sb-error-msg' );
            const lockScreen  = block.querySelector( '.sb-lock-screen' );
            const contentEl   = block.querySelector( '.sb-unlocked-content' );

            if ( ! inputEl || ! unlockBtn ) return;

            // 隐藏错误信息
            errorMsg.style.display = 'none';
            contentEl.style.display = 'none';

            async function attemptUnlock() {
                const password = inputEl.value;
                if ( ! password ) return;
                unlockBtn.disabled = true;
                errorMsg.style.display = 'none';
                try {
                    const hash = await hashPassword( password );
                    if ( hash !== storedHash ) {
                        errorMsg.textContent = '密码错误，请重试。';
                        errorMsg.style.display = 'block';
                        inputEl.classList.add( 'sb-shake' );
                        setTimeout( () => inputEl.classList.remove('sb-shake'), 600 );
                        unlockBtn.disabled = false;
                        return;
                    }
                    const plaintext = await decryptContent( encData, password );

                    // 解密内容填入容器，样式继承主题
                    contentEl.innerHTML = plaintext;

                    // 动画：锁屏淡出，内容淡入
                    lockScreen.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
                    lockScreen.style.opacity = '0';
                    lockScreen.style.transform = 'translateY(-6px)';
                    setTimeout( () => {
                        lockScreen.style.display = 'none';
                        contentEl.style.display = 'block';
                        contentEl.style.opacity = '0';
                        contentEl.style.transform = 'translateY(6px)';
                        contentEl.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
                        requestAnimationFrame( () => {
                            contentEl.style.opacity = '1';
                            contentEl.style.transform = 'translateY(0)';
                        });
                    }, 350 );

                    // 清除敏感数据
                    dataEl.removeAttribute('data-encrypted');
                    dataEl.removeAttribute('data-hash');
                } catch(e) {
                    errorMsg.textContent = '解密失败，密码可能有误。';
                    errorMsg.style.display = 'block';
                    unlockBtn.disabled = false;
                }
            }

            unlockBtn.addEventListener( 'click', attemptUnlock );
            inputEl.addEventListener( 'keydown', e => { if ( e.key === 'Enter' ) attemptUnlock(); } );
        });
    }

    function initHiddenText() {
        document.querySelectorAll( '.sb-hidden-text' ).forEach( function( el ) {
            el.setAttribute( 'role', 'button' );
            el.setAttribute( 'tabindex', '0' );
            el.setAttribute( 'title', '点击显示/隐藏内容' );
            el.addEventListener( 'click', () => el.classList.toggle('sb-revealed') );
            el.addEventListener( 'keydown', e => {
                if ( e.key === 'Enter' || e.key === ' ' ) {
                    e.preventDefault();
                    el.classList.toggle('sb-revealed');
                }
            });
        });
    }

    if ( document.readyState === 'loading' ) {
        document.addEventListener( 'DOMContentLoaded', () => { initEncryptedBlocks(); initHiddenText(); });
    } else {
        initEncryptedBlocks();
        initHiddenText();
    }
})();
