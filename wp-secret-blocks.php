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

    // 注册区块类型 - 加密区块（save() 输出静态 HTML，不需要服务端渲染）
    register_block_type( 'secret-blocks/encrypted-block', array(
        'editor_script' => 'secret-blocks-encrypted-block-editor',
        'editor_style'  => 'secret-blocks-editor',
        'style'         => 'secret-blocks-frontend',
    ) );
}
add_action( 'init', 'secret_blocks_register_blocks' );

/**
 * 加载前端脚本（解密交互）
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
