import { EVENTS } from '../consts.js';
export function mover(e, href) {
    e.preventDefault();
    window.history.pushState({}, "", href);

    const navegarEvent = new Event(EVENTS.PUSHSTATE);
    window.dispatchEvent(navegarEvent);
}
