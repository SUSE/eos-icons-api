import fs, { promises as pfs } from 'fs'
import SvgFactory from './SvgFactory'
import { svgToPng, addConfigFile, zipFolder, getThemeDir } from './tools'
import { tempDirectory } from 'common/constants'
import { customizedIconsPayload, iconsTheme, iconsThemeV1 } from 'common/types'

class ImageFactory {
    private payload: any;
    private timestamp: number;
    private iconsOutputPath: string;
    private distDir: string;
    // Will be used to locate the icons folder based on the theme
    private themeDir: string;

    constructor (payload: customizedIconsPayload, timestamp: number, theme: iconsThemeV1 | iconsTheme) {
      this.payload = payload
      this.timestamp = timestamp
      this.distDir = `${tempDirectory}/dist_${this.timestamp}/`
      this.iconsOutputPath = `${this.distDir + this.payload.exportAs}/`
      this.themeDir = getThemeDir(theme)
    }

    private async createDirectory () {
      try {
        const isTempDirExists = fs.existsSync(tempDirectory)
        if (!isTempDirExists) {
          await pfs.mkdir(tempDirectory)
        }
        await pfs.mkdir(this.distDir)
        await pfs.mkdir(this.iconsOutputPath)
      } catch (err) {
        throw new Error(`An error occured while creating the '${this.distDir}' directory: ${err}`)
      }
    }

    private async createSvg () {
      try {
        for (let i = 0; i < this.payload.icons.length; i++) {
          const iconName = this.payload.icons[i]
          const srcPath = `${this.themeDir + iconName}.svg`
          const outputPath = `${this.iconsOutputPath + iconName}.svg`
          const config = this.payload.customizationConfig

          const svgCustomizer = new SvgFactory(srcPath, config, !!config)
          const customizedSvg = svgCustomizer.finalizeIcon()
          await pfs.writeFile(outputPath, customizedSvg)
        }
      } catch (err) {
        throw new Error(`Some error occurred while generating zip file: ${err}`)
      }
    }

    private async createPng () {
      try {
        for (let i = 0; i < this.payload.icons.length; i++) {
          const iconName = this.payload.icons[i]
          const iconPath = `${this.iconsOutputPath + iconName}.svg`
          const outputPath = `${this.iconsOutputPath + iconName}.png`
          const pngBuffer = await svgToPng(this.payload.exportSize, iconPath)
          await pfs.writeFile(outputPath, pngBuffer)
          await pfs.unlink(iconPath)
        }
      } catch (err) {
        throw new Error(`Some error occurred while creating PNG file: ${err}`)
      }
    }

    private async finalize () {
      const configFilePath = `${this.distDir}/customizationConfig.json`
      const zipOutputPath = `${this.distDir}.zip`

      await addConfigFile(configFilePath, JSON.stringify(this.payload))
      await zipFolder(this.distDir, zipOutputPath)
    }

    async generatePack () {
      await this.createDirectory()
      await this.createSvg()
      if (this.payload.exportAs === 'png') {
        await this.createPng()
      }
      await this.finalize()
    }
}

export default ImageFactory
