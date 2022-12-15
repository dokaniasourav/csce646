#version 300 es

#pragma vscode_glsllint_stage: vert

/* INPUT ELEMENTS FROM JAVASCRIPT */
in vec2 a_position;
in vec2 a_texCord;

/* UNIFORM INPUTS FROM JAVASCRIPT */
uniform vec2 u_resolution;

/* Texture coordinates output to FS*/
out vec2 v_texCord;

// Called N number of times for each pixel value
void main() {
    vec2 zeroToOne = a_position / u_resolution;
    vec2 clipSpace = (zeroToOne * 2.0) - 1.0;
    gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
    v_texCord = a_texCord;
}
