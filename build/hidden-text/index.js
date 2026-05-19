/**
 * Secret Blocks - Hidden Text Format (built)
 * 隐形遮罩文本格式 - 已编译版本
 */
( function( wp ) {
    if ( ! wp || ! wp.richText || ! wp.blockEditor ) return;

    const { registerFormatType, toggleFormat } = wp.richText;
    const { RichTextToolbarButton } = wp.blockEditor;
    const { createElement: el, Fragment } = wp.element;

    const HIDDEN_TEXT_FORMAT = 'secret-blocks/hidden-text';

    const HiddenTextIcon = el( 'svg', {
        viewBox: '0 0 24 24',
        fill: 'none',
        xmlns: 'http://www.w3.org/2000/svg',
        width: 20,
        height: 20,
    },
        el( 'rect', { x: 3, y: 8, width: 18, height: 8, rx: 2, fill: 'currentColor', opacity: 0.9 } ),
        el( 'line', { x1: 7, y1: 12, x2: 17, y2: 12, stroke: 'white', strokeWidth: 1.5, strokeLinecap: 'round', opacity: 0.5 } )
    );

    registerFormatType( HIDDEN_TEXT_FORMAT, {
        title: '隐形遮罩',
        tagName: 'span',
        className: 'sb-hidden-text',
        edit: function( { isActive, value, onChange } ) {
            return el( RichTextToolbarButton, {
                icon: HiddenTextIcon,
                title: '隐形遮罩',
                onClick: function() {
                    onChange( toggleFormat( value, { type: HIDDEN_TEXT_FORMAT } ) );
                },
                isActive: isActive,
            } );
        },
    } );

} )( window.wp );
