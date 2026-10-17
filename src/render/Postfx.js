import { HalfFloatType, Vector2 } from 'three';
import {
  BlendFunction,
  BloomEffect,
  ChromaticAberrationEffect,
  EffectComposer,
  EffectPass,
  NoiseEffect,
  RenderPass,
  ToneMappingEffect,
  ToneMappingMode,
  VignetteEffect,
} from 'postprocessing';
import { POSTFX } from '../config.js';

// Bloom, then chromatic aberration, vignette and grain. Low quality keeps only bloom.
export class Postfx {
  constructor(renderer, scene, camera) {
    this.composer = new EffectComposer(renderer, {
      frameBufferType: HalfFloatType,
      multisampling: POSTFX.multisampling,
    });
    this.composer.addPass(new RenderPass(scene, camera));

    this.bloom = new BloomEffect({
      intensity: POSTFX.bloomIntensity,
      luminanceThreshold: POSTFX.bloomThreshold,
      luminanceSmoothing: POSTFX.bloomSmoothing,
      mipmapBlur: true,
      radius: POSTFX.bloomRadius,
    });
    this.composer.addPass(new EffectPass(camera, this.bloom));

    // Chromatic aberration is a convolution effect, so it gets its own pass.
    this.caOffset = new Vector2(POSTFX.caBase, POSTFX.caBase);
    const ca = new ChromaticAberrationEffect({
      offset: this.caOffset,
      radialModulation: true,
      modulationOffset: POSTFX.caModulationOffset,
    });
    const vignette = new VignetteEffect({ offset: POSTFX.vignetteOffset, darkness: POSTFX.vignetteDarkness });
    const grain = new NoiseEffect({ blendFunction: BlendFunction.OVERLAY, premultiply: true });
    grain.blendMode.opacity.value = POSTFX.grainOpacity;
    const toneHigh = new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC });
    const toneLow = new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC });

    this.high = new EffectPass(camera, ca, vignette, grain, toneHigh);
    this.low = new EffectPass(camera, toneLow);
    this.final = null;
    this.setLowQuality(false);
  }

  // Only the last pass in the chain draws to the screen, so swap it rather than disabling it.
  setLowQuality(low) {
    const next = low ? this.low : this.high;
    if (this.final === next) return;
    if (this.final) this.composer.removePass(this.final);
    this.composer.addPass(next);
    this.final = next;
    this.lowQuality = low;
  }

  // Extra aberration on top of the resting amount (hits, high multipliers).
  setAberration(extra) {
    const v = POSTFX.caBase + extra;
    this.caOffset.set(v, v);
  }

  setSize(w, h) {
    this.composer.setSize(w, h, false);
  }

  render(dt) {
    this.composer.render(dt);
  }
}
