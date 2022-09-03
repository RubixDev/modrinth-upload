# Modrinth Uploader

An action for interacting with the [Modrinth file upload API](https://docs.modrinth.com/api-spec)

## Usage/Arguments

| Name               | Description                                                                                                                                                                                            | Default Value | Required |
|--------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------|----------|
| `token`            | Token used to authenticate with Modrinth API. Use a repository secret for this                                                                                                                         | N/A           | ✅       |
| `file_path`        | The path to the file you want to upload                                                                                                                                                                | N/A           | ✅       |
| `name`             | The display name for this file                                                                                                                                                                         | N/A           | ✅       |
| `version`          | The version number. Ideally will follow semantic versioning                                                                                                                                            | N/A           | ✅       |
| `changelog`        | The change log for this version                                                                                                                                                                        |               | ❌       |
| `relations`        | List of projects this file is related to and their relation type. Separate with `,`. Format: `projectId:relationType` - Valid relationTypes are: `required`, `optional`, `incompatible` and `embedded` |               | ❌       |
| `game_versions`    | The game versions to select on this file. Separate with `,`                                                                                                                                            | N/A           | ✅       |
| `release_type`     | The type of this release. Allowed values: `alpha`, `beta`, `release`                                                                                                                                   | `release`     | ❌       |
| `loaders`          | The mod loaders that this version supports. Separate with `,`                                                                                                                                          | N/A           | ✅       |
| `featured`         | Whether the version is featured or not                                                                                                                                                                 | N/A           | ✅       |
| `project_id`       | Project ID to upload file to. You can get the ID from the sidebar on a project page under "Technical Information"                                                                                      | N/A           | ✅       |
| `staging`          | Whether to use Modrinth's staging api                                                                                                                                                                  | `false`       | ❌       |
| `new_project_body` | A new body for the mod page                                                                                                                                                                            |               | ❌       |

## Example Workflow

```yml
name: "Build and Publish"
on:
  release:
    types: [published]
jobs:
  build-and-publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Set up JDK 17
        uses: actions/setup-java@v2
        with:
          distribution: 'temurin'
          java-version: 17
          cache: 'gradle'

      - name: Build with Gradle
        id: build,
        run: chmod +x gradlew && ./gradlew build

      - name: Find correct JAR
        id: findjar
        run: |
          output="$(find build/libs/ ! -name "*-dev.jar" ! -name "*-sources.jar" -type f -printf "%f\n")"
          echo "::set-output name=jarname::$output"

      - name: Upload to the GitHub release
        uses: actions/upload-release-asset@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          upload_url: ${{ github.event.release.upload_url }}
          asset_path: build/libs/${{ steps.findjar.outputs.jarname }}
          asset_name: ${{ steps.findjar.outputs.jarname }}
          asset_content_type: application/java-archive

      - name: Upload to Modrinth
        uses: RubixDev/modrinth-upload@v1
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          file_path: build/libs/${{ steps.findjar.outputs.jarname }}
          name: My super cool mod ${{ github.event.release.tag_name }}
          version: ${{ github.event.release.tag_name }}
          changelog: ${{ github.event.release.body }}
          relations: P7dR8mSH:required
          game_versions: 1.19,1.19.1,1.19.2
          release_type: beta
          loaders: fabric,forge
          featured: true
          project_id: abcDEFGH
```
