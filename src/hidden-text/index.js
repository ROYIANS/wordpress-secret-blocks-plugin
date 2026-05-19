/**
 * 隐形文本 - Rich Text Format 注册
 * 在编辑器中通过 [h]...[/h] 或工具栏按钮添加遮罩文本
 */
( function( wp ) {
    const { registerFormatType, toggleFormat } = wp.richText;
    const { RichTextToolbarButton } = wp.blockEditor;
    const { __ } = wp.i18n;

    const HIDDEN_TEXT_FORMAT = 'secret-blocks/hidden-text';

    // 遮罩图标 SVG
    const HiddenTextIcon = wp.element.createElement(
        'svg',
        {
            viewBox: '0 0 24 24',
            fill: 'none',
            xmlns: 'http://www.w3.org/2000/svg',
            width: 20,
            height: 20,
        },
        wp.element.createElement( 'rect', {
            x: 3, y: 8, width: 18, height: 8, rx: 2,
            fill: 'currentColor', opacity: 0.9
        } ),
        wp.element.createElement( 'path', {
            d: 'M7 12h10',
            stroke: 'white', strokeWidth: 1.5, strokeLinecap: 'round', opacity: 0.5
        } )
    );

    // 注册 Rich Text 格式
    registerFormatType( HIDDEN_TEXT_FORMAT, {
        title: __( '隐形遮罩', 'secret-blocks' ),
        tagName: 'span',
        className: 'sb-hidden-text',

        edit: function( { isActive, value, onChange } ) {
            return wp.element.createElement(
                RichTextToolbarButton,
                {
                    icon: HiddenTextIcon,
                    title: __( '隐形遮罩', 'secret-blocks' ),
                    onClick: function() {
                        onChange(
                            toggleFormat( value, { type: HIDDEN_TEXT_FORMAT } )
                        );
                    },
                    isActive: isActive,
                }
            );
        },
    } );

} )( window.wp );
