import { Button } from './Button.js';

export class InfoButton extends Button {
    constructor(scene, parentButton, tooltipText, options = {}) {
        const parentWidth = parentButton.rect.width;

        const defaultX = parentButton.rect.x + parentWidth / 2 + 40;
        const defaultY = parentButton.rect.y;
        const x = options.x ?? defaultX;
        const y = options.y ?? defaultY;

        const { x: _x, y: _y, ...rest } = options;

        const defaults = {
            width: 60,
            height: 60,
            color: 0x4444aa,
            hoverColor: 0x5555bb,
            fontSize: '20px',
            labelStyle: { fontSize: '20px', fill: '#fff' }
        };

        super(scene, x, y, 'i', { ...defaults, ...rest });

        this.tooltip = scene.add.text(x, y + 30, tooltipText, {
            fontSize: '16px',
            fill: '#fff',
            backgroundColor: '#000000cc',
            padding: { x: 8, y: 4 }
        }).setOrigin(0.5).setVisible(false).setDepth(1000);
    }

    toggleTooltip() {
        this.tooltip.setVisible(!this.tooltip.visible);
    }

    hideTooltip() {
        this.tooltip.setVisible(false);
    }

    setVisible(visible) {
        super.setVisible(visible);
        if (!visible) this.tooltip.setVisible(false);
        return this;
    }

    destroy() {
        super.destroy();
        this.tooltip.destroy();
    }
}
