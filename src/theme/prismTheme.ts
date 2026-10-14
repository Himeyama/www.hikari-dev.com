import type {PrismTheme} from 'prism-react-renderer';

/** ANSI VGA colors on the same black surface as the surrounding page. */
const prismTheme: PrismTheme = {
  plain: {color: '#ffffff', backgroundColor: '#000000'},
  styles: [
    {types: ['comment', 'prolog', 'doctype', 'cdata'], style: {color: '#aaaaaa'}},
    {types: ['punctuation', 'operator'], style: {color: '#ffffff'}},
    {types: ['keyword', 'tag', 'deleted'], style: {color: '#ff5555'}},
    {types: ['string', 'char', 'attr-value', 'inserted'], style: {color: '#55ff55'}},
    {types: ['number', 'boolean', 'constant'], style: {color: '#ff55ff'}},
    {types: ['function', 'class-name', 'builtin'], style: {color: '#ffff55'}},
    {types: ['attr-name', 'property', 'selector'], style: {color: '#55ffff'}},
    {types: ['important', 'bold'], style: {fontWeight: 'bold'}},
    {types: ['italic'], style: {fontStyle: 'italic'}},
  ],
};

export default prismTheme;
