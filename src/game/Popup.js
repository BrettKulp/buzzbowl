export class Popup {
    constructor(scene, x, y, label, options = {}) {
        const {
            width = 170,
            height = 75,
            bgColor = 0x000000,
            buttonColor = 0x5555bb,
            fontSize = '30px'
        } = options;

        this.scene = scene;

        this.bgRect = scene.add.rectangle(x, y - height / 2 - 5, width, height, bgColor);
        this.bgRect.setVisible(false);

        this.labelText = scene.add.text(x, y - height / 2 - 5, label, { fontSize, fill: '#fff' })
            .setOrigin(0.5)
            .setVisible(false);

        this.button = scene.add.rectangle(x, y + height / 2 + 5, width, height, buttonColor);
        this.button.setVisible(false);

        this.buttonText = scene.add.text(x, y + height / 2 + 5, 'Next Play', { fontSize, fill: '#fff' })
            .setOrigin(0.5)
            .setVisible(false);
    }

    show() {
        this.bgRect.setVisible(true);
        this.labelText.setVisible(true);
        this.button.setVisible(true);
        this.button.setInteractive({ useHandCursor: true });
        this.button.setFillStyle(0x5555bb);
        this.button.on('pointerover', () => this.button.setFillStyle(0x5555bb));
        this.button.on('pointerout', () => this.button.setFillStyle(0x4444aa));
        this.buttonText.setVisible(true);
    }

    hide() {
        this.bgRect.setVisible(false);
        this.labelText.setVisible(false);
        this.button.setVisible(false);
        this.button.disableInteractive();
        this.buttonText.setVisible(false);
    }

    setLabel(text) {
        this.labelText.setText(text);
    }

    onClick(fn) {
        this.button.on('pointerdown', fn);
        return this;
    }
}
