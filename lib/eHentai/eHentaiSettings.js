"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetSettings = exports.modifySearch = void 0;
const modifySearch = (stateManager) => {
    return createNavigationButton({
        id: 'modifySearch',
        value: '',
        label: 'Modify Search',
        form: createForm({
            onSubmit: async (values) => {
                stateManager.store('extraSearchArgs', values.extraSearchArgs.replace(/[“”‘’]/g, '"'));
            },
            validate: async () => true,
            sections: async () => {
                return [createSection({
                        id: 'modifySearchSection',
                        footer: 'Note: searches with only exclusions do not work, including on the home page',
                        rows: async () => {
                            return [createInputField({
                                    id: 'extraSearchArgs',
                                    value: await stateManager.retrieve('extraSearchArgs') ?? '',
                                    placeholder: '-guro -"males only"',
                                    label: 'Extra Args:',
                                    maskInput: false
                                })];
                        }
                    })];
            }
        })
    });
};
exports.modifySearch = modifySearch;
const resetSettings = (stateManager) => {
    return createButton({
        id: 'resetSettings',
        label: 'Reset to Default',
        value: '',
        onTap: async () => {
            stateManager.store('extraSearchArgs', null);
        }
    });
};
exports.resetSettings = resetSettings;
//# sourceMappingURL=eHentaiSettings.js.map