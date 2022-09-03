const core = require('@actions/core')
const fs = require('fs')
const req = require('request')

const API_URL = 'https://api.modrinth.com/v2'
const STAGING_API_URL = 'https://staging-api.modrinth.com/v2'

async function run() {
    const token = core.getInput('token', { required: true })
    const filePath = core.getInput('file_path', { required: true })
    if (!fs.existsSync(filePath)) {
        core.setFailed('Specified file at ' + filePath + ' does not exist!')
    }
    const name = core.getInput('name', { required: true })
    const version = core.getInput('version', { required: true })
    const changelog = core.getInput('changelog', { required: false })
    const relationsString = core.getInput('relations', { required: false })
    const relations = []
    for (const project of relationsString.split(',')) {
        if (project === null || project === '') continue
        const [project_id, dependency_type] = project.split(':')
        if (
            !['required', 'optional', 'incompatible', 'embedded'].includes(
                dependency_type,
            )
        ) {
            core.setFailed(
                `Invalid relation type: ${dependency_type} (valid values: "required", "optional", "incompatible", "embedded")`,
            )
        }
        relations.push({ project_id, dependency_type })
    }
    const gameVersions = core
        .getInput('game_versions', { required: true })
        .split(',')
    const releaseType = core.getInput('release_type', { required: false })
    if (!['', 'alpha', 'beta', 'release'].includes(releaseType)) {
        core.setFailed(
            `Invalid release type: ${releaseType} (valid values: "alpha", "beta", "release")`,
        )
    }
    const modLoaders = core.getInput('loaders', { required: true }).split(',')
    const featured =
        core.getInput('featured', { required: true }).toLowerCase() === 'true'
    const projectId = core.getInput('project_id', { required: true })
    const staging =
        (
            core.getInput('staging', { required: false }) || 'false'
        ).toLowerCase() === 'true'
    const newProjectBody = core.getInput('new_project_body', {
        required: false,
    })

    let data = {
        name,
        version_number: version,
        dependencies: relations,
        game_versions: gameVersions,
        version_type: releaseType || 'release',
        loaders: modLoaders,
        featured,
        project_id: projectId,
        file_parts: ['file'],
    }
    if (changelog) data.changelog = changelog

    core.debug('Request body: ' + JSON.stringify(data))
    const options = {
        method: 'POST',
        url: (staging ? STAGING_API_URL : API_URL) + '/version',
        headers: {
            'Content-Type': 'multipart/form-data',
            'User-Agent': 'github.com/RubixDev/modrinth-upload',
            Authorization: token,
        },
        formData: {
            data: JSON.stringify(data),
            file: fs.createReadStream(filePath),
        },
    }
    req.post(options, (err, response, body) => {
        if (!err) {
            core.debug('Response code: ' + response.statusCode)
            if (response.statusCode == 200) {
                core.debug(`Response body:\n${response.body}`)
                core.setOutput('id', JSON.parse(body).id.toString())
            } else {
                core.setFailed(
                    `${response.statusCode}: ${response.statusMessage}\nResponse body:\n${response.body}\nRequest body:${body}`,
                )
            }
        } else {
            core.setFailed(
                `Request error:${err}\nResponse body:\n${response.body}\nRequest body:${body}`,
            )
        }
    })

    if (newProjectBody) {
        req.patch({
            method: 'PATCH',
            url:
                (staging ? STAGING_API_URL : API_URL) + '/project/' + projectId,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'github.com/RubixDev/modrinth-upload',
                Authorization: token,
            },
            body: JSON.stringify({
                body: newProjectBody,
            }),
        })
    }
}

try {
    run()
} catch (error) {
    core.setFailed(error.message)
    throw error
}
