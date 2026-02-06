"""
AI Copilot
Natural language interface for TMS queries (Thai language support)
Uses OpenAI GPT for intelligent responses and recommendations
"""

import os
from typing import Dict, Any, List, Optional
from openai import OpenAI

class AICopilot:
    def __init__(self):
        self.client = None
        api_key = os.getenv("OPENAI_API_KEY")
        
        if api_key:
            self.client = OpenAI(api_key=api_key)
            print("✅ AI Copilot initialized with OpenAI")
        else:
            print("⚠️  OpenAI API key not found. AI Copilot will use fallback responses.")
    
    def is_loaded(self) -> bool:
        return self.client is not None
    
    def query(self, query: str, context: Optional[Dict[str, Any]] = None,
              user_role: str = "planner") -> Dict[str, Any]:
        """
        Process natural language query and return intelligent response
        Supports Thai language
        """
        
        if not self.is_loaded():
            return self._fallback_response(query, context)
        
        # Build system prompt based on role
        system_prompt = self._build_system_prompt(user_role)
        
        # Build context message
        context_str = ""
        if context:
            context_str = f"\n\nContext:\n{self._format_context(context)}"
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"{query}{context_str}"}
                ],
                temperature=0.7,
                max_tokens=500
            )
            
            answer = response.choices[0].message.content
            
            # Extract suggestions and actions from response
            suggestions = self._extract_suggestions(answer)
            actions = self._extract_actions(answer, user_role)
            
            return {
                "answer": answer,
                "suggestions": suggestions,
                "actions": actions,
                "confidence": 0.85
            }
            
        except Exception as e:
            print(f"Error calling OpenAI API: {e}")
            return self._fallback_response(query)
    
    def _build_system_prompt(self, user_role: str) -> str:
        """Build system prompt based on user role"""
        base_prompt = """คุณคือ AI Copilot สำหรับระบบ Transportation Management System (TMS) 
คุณช่วยผู้ใช้วิเคราะห์ข้อมูล ตอบคำถาม และให้คำแนะนำเกี่ยวกับการจัดการขนส่งและโลจิสติกส์

คุณสามารถ:
- วิเคราะห์ KPI และประสิทธิภาพการส่งของ
- แนะนำวิธีแก้ปัญหาเมื่อมีความล่าช้า
- ช่วยวางแผนเส้นทางให้เหมาะสม
- ตอบคำถามเกี่ยวกับสถานะการส่งของ
- ให้คำแนะนำเชิงธุรกิจ

ตอบเป็นภาษาไทยที่เข้าใจง่าย กระชับ และให้ข้อมูลที่เป็นประโยชน์
"""
        
        role_specific = {
            "admin": "\nคุณกำลังช่วยผู้ดูแลระบบ ให้ข้อมูลระดับภาพรวมและการจัดการระบบ",
            "planner": "\nคุณกำลังช่วยผู้วางแผนเส้นทาง ให้คำแนะนำเกี่ยวกับการเพิ่มประสิทธิภาพเส้นทาง",
            "dispatcher": "\nคุณกำลังช่วยผู้ควบคุมการส่งของ ให้ข้อมูลเรียลไทม์และการแก้ปัญหาเฉพาะหน้า",
            "driver": "\nคุณกำลังช่วยคนขับรถ ให้คำแนะนำที่เข้าใจง่ายและใช้งานได้จริง",
            "customer": "\nคุณกำลังช่วยลูกค้า ให้ข้อมูลเกี่ยวกับสถานะการส่งของ"
        }
        
        return base_prompt + role_specific.get(user_role, "")
    
    def _format_context(self, context: Dict[str, Any]) -> str:
        """Format context data for the prompt"""
        formatted = []
        for key, value in context.items():
            formatted.append(f"- {key}: {value}")
        return "\n".join(formatted)
    
    def _extract_suggestions(self, answer: str) -> List[str]:
        """Extract actionable suggestions from answer"""
        # Simple extraction - in production, use more sophisticated NLP
        suggestions = []
        
        if "แนะนำ" in answer or "ควร" in answer:
            lines = answer.split('\n')
            for line in lines:
                if any(word in line for word in ["แนะนำ", "ควร", "ลอง", "พิจารณา"]):
                    suggestions.append(line.strip('- ').strip())
        
        return suggestions[:3]  # Return top 3
    
    def _extract_actions(self, answer: str, user_role: str) -> List[Dict[str, Any]]:
        """Extract possible actions from answer"""
        actions = []
        
        # Define role-specific actions
        if user_role == "planner":
            if "เพิ่มรถ" in answer:
                actions.append({
                    "type": "add_vehicle",
                    "label": "เพิ่มรถเข้าแผน",
                    "requires_approval": True
                })
            if "เปลี่ยนเส้นทาง" in answer or "ปรับเส้นทาง" in answer:
                actions.append({
                    "type": "replan_route",
                    "label": "สร้างแผนเส้นทางใหม่",
                    "requires_approval": True
                })
        
        elif user_role == "dispatcher":
            if "มอบหมาย" in answer or "assign" in answer.lower():
                actions.append({
                    "type": "reassign_driver",
                    "label": "มอบหมายคนขับใหม่",
                    "requires_approval": False
                })
        
        return actions
    
    def _fallback_response(self, query: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Fallback response when OpenAI is not available, using real context"""
        
        query_lower = query.lower()
        context = context or {}
        
        # Summary data from context
        total_orders = context.get('total_orders', 0)
        on_time_rate = context.get('on_time_rate', 0)
        alerts = context.get('recent_alerts', [])
        
        if any(word in query_lower for word in ["สรุป", "ภาพรวม", "status", "summary"]):
            answer = f"ขณะนี้มีออเดอร์ทั้งหมด {total_orders} รายการ โดยมีอัตราการส่งมอบตรงเวลาอยู่ที่ {on_time_rate}%"
            if alerts:
                answer += f"\n\nพบการแจ้งเตือนสำคัญ {len(alerts)} รายการ ล่าสุดคือ: '{alerts[0].get('message')}'"
            else:
                answer += "\n\nสถานะการดำเนินงานปกติ ไม่พบการแจ้งเตือนที่ผิดปกติครับ"
                
        elif any(word in query_lower for word in ["late", "ล่าช้า", "สาย", "ช้า"]):
            if alerts:
                late_alerts = [a for a in alerts if a.get('severity') == 'high' or 'late' in a.get('message', '').lower()]
                if late_alerts:
                    answer = f"พบรถที่มีโอกาสส่งล่าช้า {len(late_alerts)} คัน:\n"
                    for a in late_alerts[:3]:
                        answer += f"- {a.get('message')} ({a.get('time_ago')})\n"
                else:
                    answer = "ขณะนี้ยังไม่มีรายงานรถส่งของล่าช้าที่ผิดปกติครับ แนะนำให้ตรวจสอบหน้า Dispatch Monitoring เพื่อความแน่ใจ"
            else:
                answer = "ขณะนี้ระบบยังไม่ได้รับรายงานความล่าช้าครับ สถานะการส่งมอบ (OTD) อยู่ที่ " + str(on_time_rate) + "%"

        elif any(word in query_lower for word in ["cost", "ค่าใช้จ่าย", "ราคา"]):
            total_cost = context.get('total_cost', 0)
            answer = f"ต้นทุนการดำเนินงานในวันนี้อยู่ที่ประมาณ ฿{total_cost:,.2f}"
            answer += "\n\nคำแนะนำในการลดต้นทุน:\n- ปรับแผนเส้นทางเพื่อลดระยะทางวิ่งรวม\n- ตรวจสอบการใช้รถ (Utilization) ให้เหมาะสมกับปริมาณงาน"
            
        else:
            answer = "สวัสดีครับ! ผม AI Copilot พร้อมช่วยคุณวิเคราะห์ข้อมูล TMS วันนี้ครับ ลองถามสั้นๆ เช่น 'สรุปงานวันนี้' หรือ 'ค่าใช้จ่ายวันนี้เท่าไหร่'"
            
        return {
            "answer": answer,
            "suggestions": ["สรุปงานวันนี้", "ตรวจสอบการแจ้งเตือน", "ดูสถิติต้นทุน"],
            "actions": [],
            "confidence": 0.5
        }
