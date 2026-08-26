(()=>{
'use strict';
window.SETKA_FOUNDATION_CONSTANTS_V018={
  version:'0.1.8',
  policy:'additive-lineage',
  principle:'Новая версия наследует все утверждённые сущности и возможности родителя. Удаление возможно только по прямому решению Президента.',
  constants:[
    {id:'PRESIDENT',name:'Президент',since:'root',level:'seed',definition:'Корневой актор системы и единственный источник продуктового решения.',immutable:true},
    {id:'PRESIDENT_CABINET',name:'Президентский кабинет',since:'root',level:'root',definition:'Корневая административная поверхность, из которой управляются сущности и связи системы.',immutable:true},
    {id:'SETKA_ID',name:'SETKA ID',since:'0.1.7',level:'root',definition:'Постоянная идентичность. Человек/синтетик и Front/Back являются слоями роли и прав, а не новыми ID.',immutable:true},
    {id:'SURFACE',name:'Поверхность доступа',since:'0.1.7',level:'root',definition:'Front и Back/Admin задаются независимо для существующего ID.',immutable:true},
    {id:'VERSION',name:'Версия Foundation',since:'0.1.4',level:'system',definition:'Узел родословной продукта. Версия хранит родителя и только добавляет дельту поверх него.',immutable:true},
    {id:'PIN',name:'Пин',since:'0.1.6',level:'system',definition:'Адресная задача или предложение, привязанное к версии, поверхности и конкретному месту.',immutable:true},
    {id:'SYNTHETIC',name:'Синтетик',since:'0.1.6',level:'entity',definition:'SETKA ID природы synthetic с автономным исследовательским поведением в пределах выданных прав.',immutable:true},
    {id:'PATTERN',name:'Паттерн',since:'root',level:'entity',definition:'Контентная сущность Front, для которой сохраняются открытия, избранное и взаимодействия.',immutable:true},
    {id:'SESSION_TRACE',name:'Сессия / TRACE',since:'0.1.6',level:'entity',definition:'Запись движения и действий ID по продукту с возможностью реконструкции пути.',immutable:true}
  ],
  relations:[
    {from:'PRESIDENT',type:'owns',to:'PRESIDENT_CABINET',label:'владеет корневым кабинетом'},
    {from:'PRESIDENT_CABINET',type:'manages',to:'SETKA_ID',label:'создаёт и управляет ID'},
    {from:'SETKA_ID',type:'has_access',to:'SURFACE',label:'получает независимые права Front / Back'},
    {from:'VERSION',type:'contains',to:'PIN',label:'содержит адресные задачи версии'},
    {from:'SYNTHETIC',type:'is',to:'SETKA_ID',label:'является ID природы synthetic'},
    {from:'SETKA_ID',type:'runs',to:'SESSION_TRACE',label:'создаёт сессии и TRACE'},
    {from:'SESSION_TRACE',type:'touches',to:'PATTERN',label:'фиксирует взаимодействия с паттернами'}
  ]
};
})();