<?php
/**
 * Plugin Name: Secret Blocks
 * Plugin URI: https://github.com/ROYIANS/wordpress-secret-blocks-plugin
 * Description: 提供隐形遮罩文本和密码加密区块两个 Gutenberg 功能区块。
 * Version: 1.0.0
 * Author: ROYIANS
 * License: GPL-2.0-or-later
 * Text Domain: secret-blocks
 */

defined( 'ABSPATH' ) || exit;

define( 'SECRET_BLOCKS_VERSION', '1.0.0' );
define( 'SECRET_BLOCKS_DIR', plugin_dir_path( __FILE__ ) );
define( 'SECRET_BLOCKS_URL', plugin_dir_url( __FILE__ ) );

/**
 * 注册区块
 */
function secret_blocks_register_blocks() {
    // 注册隐形文本区块脚本
    wp_register_script(
        'secret-blocks-hidden-text-editor',
        SECRET_BLOCKS_URL . 'build/hidden-text/index.js',
        array( 'wp-blocks', 'wp-element', 'wp-editor', 'wp-components', 'wp-i18n', 'wp-rich-text' ),
        SECRET_BLOCKS_VERSION,
        true
    );

    // 注册加密区块脚本
    wp_register_script(
        'secret-blocks-encrypted-block-editor',
        SECRET_BLOCKS_URL . 'build/encrypted-block/index.js',
        array( 'wp-blocks', 'wp-element', 'wp-editor', 'wp-components', 'wp-i18n', 'wp-block-editor' ),
        SECRET_BLOCKS_VERSION,
        true
    );

    // 注册前端样式
    wp_register_style(
        'secret-blocks-frontend',
        SECRET_BLOCKS_URL . 'build/frontend.css',
        array(),
        SECRET_BLOCKS_VERSION
    );

    // 注册编辑器样式
    wp_register_style(
        'secret-blocks-editor',
        SECRET_BLOCKS_URL . 'build/editor.css',
        array( 'wp-edit-blocks' ),
        SECRET_BLOCKS_VERSION
    );

    // 注册区块类型 - 隐形文本格式
    register_block_type( 'secret-blocks/hidden-text', array(
        'editor_script' => 'secret-blocks-hidden-text-editor',
        'editor_style'  => 'secret-blocks-editor',
        'style'         => 'secret-blocks-frontend',
    ) );

    // 注册区块类型 - 加密区块
    register_block_type( 'secret-blocks/encrypted-block', array(
        'editor_script'   => 'secret-blocks-encrypted-block-editor',
        'editor_style'    => 'secret-blocks-editor',
        'style'           => 'secret-blocks-frontend',
        'render_callback' => 'secret_blocks_render_encrypted_block',
        'attributes'      => array(
            'encryptedContent' => array(
                'type'    => 'string',
                'default' => '',
            ),
            'passwordHash' => array(
                'type'    => 'string',
                'default' => '',
            ),
            'hint' => array(
                'type'    => 'string',
                'default' => '',
            ),
        ),
    ) );
}
add_action( 'init', 'secret_blocks_register_blocks' );

/**
 * 加密区块服务端渲染
 */
function secret_blocks_render_encrypted_block( $attributes ) {
    $encrypted_content = isset( $attributes['encryptedContent'] ) ? $attributes['encryptedContent'] : '';
    $password_hash     = isset( $attributes['passwordHash'] ) ? $attributes['passwordHash'] : '';
    $hint              = isset( $attributes['hint'] ) ? esc_html( $attributes['hint'] ) : '';

    if ( empty( $encrypted_content ) || empty( $password_hash ) ) {
        return '<div class="sb-encrypted-block sb-no-content"><span class="sb-lock-icon">🔒</span><p>此区块尚未设置内容或密码。</p></div>';
    }

    $block_id = 'sb-enc-' . wp_generate_uuid4();

    ob_start();
    ?>
    <div class="sb-encrypted-block" 
         id="<?php echo esc_attr( $block_id ); ?>"
         data-encrypted="<?php echo esc_attr( $encrypted_content ); ?>"
         data-hash="<?php echo esc_attr( $password_hash ); ?>">
        <div class="sb-lock-screen">
            <div class="sb-lock-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="sb-lock-svg">
                    <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" stroke-width="1.5"/>
                    <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    <circle cx="12" cy="16" r="1.5" fill="currentColor"/>
                </svg>
            </div>
            <p class="sb-lock-title">内容已加密</p>
            <?php if ( $hint ) : ?>
                <p class="sb-lock-hint">提示：<?php echo $hint; ?></p>
            <?php endif; ?>
            <div class="sb-input-wrap">
                <input type="password" 
                       class="sb-password-input" 
                       placeholder="输入密码以查看内容"
                       autocomplete="off" />
                <button class="sb-unlock-btn" type="button">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M5 12l7-7 7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M12 5v14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </button>
            </div>
            <p class="sb-error-msg" style="display:none;">密码错误，请重试。</p>
        </div>
        <div class="sb-unlocked-content" style="display:none;"></div>
    </div>
    <?php
    return ob_get_clean();
}

/**
 * 加载前端脚本
 */
function secret_blocks_frontend_scripts() {
    wp_enqueue_script(
        'secret-blocks-frontend',
        SECRET_BLOCKS_URL . 'build/frontend.js',
        array(),
        SECRET_BLOCKS_VERSION,
        true
    );
}
add_action( 'wp_enqueue_scripts', 'secret_blocks_frontend_scripts' );
